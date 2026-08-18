"""
Servicio de envío de correos por SMTP.

Configurable mediante variables de entorno (ver app/core/config.py):
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME,
SMTP_STARTTLS y FRONTEND_URL.

Si SMTP no está configurado (SMTP_HOST o SMTP_USER vacíos), `enviar_email` lanza
`EmailNoConfiguradoError`. Los callers deben capturar los errores para que un fallo
de envío NO deshaga un registro que ya fue creado en la base de datos.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import settings


class EmailNoConfiguradoError(RuntimeError):
    """Se lanza cuando se intenta enviar un correo sin configuración SMTP."""
    pass


class EmailEnvioError(RuntimeError):
    """Se lanza cuando falla el envío del correo (conexión/autenticación/etc.)."""
    pass


def smtp_configurado() -> bool:
    """Indica si hay configuración SMTP mínima para poder enviar correos."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER)


def enviar_email(destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str | None = None) -> None:
    """
    Envía un correo. Lanza EmailNoConfiguradoError si falta configuración SMTP
    o EmailEnvioError si el envío falla.
    """
    if not smtp_configurado():
        raise EmailNoConfiguradoError("SMTP no configurado")

    remitente = settings.SMTP_FROM or settings.SMTP_USER

    mensaje = MIMEMultipart("alternative")
    mensaje["Subject"] = asunto
    mensaje["From"] = formataddr((settings.SMTP_FROM_NAME, remitente))
    mensaje["To"] = destinatario

    mensaje.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
    if cuerpo_html:
        mensaje.attach(MIMEText(cuerpo_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as servidor:
            if settings.SMTP_STARTTLS:
                servidor.starttls()
            if settings.SMTP_USER:
                servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.sendmail(remitente, [destinatario], mensaje.as_string())
    except EmailNoConfiguradoError:
        raise
    except Exception as e:  # noqa: BLE001 - queremos envolver cualquier fallo de red/SMTP
        raise EmailEnvioError(str(e)) from e


def enviar_bienvenida_medico(
    email: str,
    nombre: str,
    hospital_nombre: str,
    password_temporal: str,
) -> None:
    """
    Envía el correo de bienvenida con las credenciales temporales al médico.
    Lanza EmailNoConfiguradoError o EmailEnvioError si no puede enviarse.
    """
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    asunto = "Bienvenido a Salud en Mapa"

    cuerpo_texto = (
        f"Bienvenido a Salud en Mapa\n\n"
        f"Hola {nombre},\n\n"
        f"Se ha creado una cuenta para usted.\n\n"
        f"Hospital: {hospital_nombre}\n"
        f"Usuario: {email}\n"
        f"Contraseña temporal: {password_temporal}\n\n"
        f"Ingrese al sistema y cambie su contraseña: {login_url}\n\n"
        f"Este es un mensaje automático, por favor no responda a este correo."
    )

    cuerpo_html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #7c3aed;">Bienvenido a Salud en Mapa</h2>
    <p>Hola <strong>{nombre}</strong>,</p>
    <p>Se ha creado una cuenta para usted.</p>
    <table style="border-collapse: collapse;">
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Hospital:</strong></td><td>{hospital_nombre}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Usuario:</strong></td><td>{email}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Contraseña temporal:</strong></td>
          <td><code style="font-size: 16px;">{password_temporal}</code></td></tr>
    </table>
    <p style="margin-top: 16px;">
      <a href="{login_url}"
         style="background: #7c3aed; color: #fff; padding: 10px 18px; border-radius: 8px;
                text-decoration: none;">Ingresar al sistema</a>
    </p>
    <p>Por seguridad, <strong>cambie su contraseña</strong> en el primer inicio de sesión.</p>
    <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático, por favor no responda a este correo.</p>
  </body>
</html>
"""

    enviar_email(email, asunto, cuerpo_texto, cuerpo_html)


def enviar_recuperacion_password(
    email: str,
    nombre: str,
    token: str,
    expira_minutos: int,
) -> None:
    """
    Envía el correo de recuperación de contraseña con el código/enlace.
    Incluye el código (para pegar en la app móvil) y un enlace al frontend web.
    Lanza EmailNoConfiguradoError o EmailEnvioError si no puede enviarse.
    """
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    asunto = "Recuperación de contraseña - Salud en Mapa"

    cuerpo_texto = (
        f"Recuperación de contraseña\n\n"
        f"Hola {nombre},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Código de recuperación: {token}\n\n"
        f"Ingresá este código en la app para definir una nueva contraseña, "
        f"o abrí este enlace: {reset_url}\n\n"
        f"El código vence en {expira_minutos} minutos y solo puede usarse una vez.\n\n"
        f"Si no solicitaste este cambio, podés ignorar este mensaje.\n\n"
        f"Este es un mensaje automático, por favor no respondas a este correo."
    )

    cuerpo_html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #2571b6;">Recuperación de contraseña</h2>
    <p>Hola <strong>{nombre}</strong>,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Código de recuperación:</p>
    <p style="font-size: 18px; background: #f3f4f6; padding: 10px 14px; border-radius: 8px;
              display: inline-block;"><code>{token}</code></p>
    <p>Ingresá este código en la app para definir una nueva contraseña, o usá el botón:</p>
    <p style="margin-top: 12px;">
      <a href="{reset_url}"
         style="background: #2571b6; color: #fff; padding: 10px 18px; border-radius: 8px;
                text-decoration: none;">Restablecer contraseña</a>
    </p>
    <p style="color: #6b7280;">El código vence en {expira_minutos} minutos y solo puede usarse una vez.
       Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
  </body>
</html>
"""

    enviar_email(email, asunto, cuerpo_texto, cuerpo_html)
