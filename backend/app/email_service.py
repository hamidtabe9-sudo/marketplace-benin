import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("marketplace.auth.email")


class EmailDeliveryError(RuntimeError):
    pass


def send_auth_code(*, email: str, code: str, purpose: str) -> None:
    subject, instruction = {
        "verify_email": (
            "Vérification de votre adresse e-mail - BIZNESS",
            "Utilisez ce code pour confirmer votre adresse e-mail :",
        ),
        "password_reset": (
            "Réinitialisation du mot de passe - BIZNESS",
            "Utilisez ce code pour choisir un nouveau mot de passe :",
        ),
    }[purpose]
    body = f"{instruction}\n\n{code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."

    host = os.getenv("SMTP_HOST", "").strip()
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if not host:
        if app_env == "development":
            logger.warning("CODE E-MAIL DE DÉVELOPPEMENT pour %s (%s): %s", email, purpose, code)
            return
        raise EmailDeliveryError("Le service d’envoi d’e-mail n’est pas configuré.")

    sender = os.getenv("SMTP_FROM", "").strip()
    if not sender:
        raise EmailDeliveryError("SMTP_FROM doit être configuré pour envoyer les e-mails.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = email
    message.set_content(body)
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true"

    try:
        with smtplib.SMTP(host, port, timeout=12) as server:
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()
            if username:
                server.login(username, password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Échec d'envoi d'un e-mail d'authentification")
        raise EmailDeliveryError("Impossible d’envoyer l’e-mail pour le moment.") from exc
