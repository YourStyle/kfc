from flask_mail import Message
from flask import current_app
from app import mail
import os
import logging
import sys

logger = logging.getLogger(__name__)


def send_verification_email(email: str, code: str):
    """Send verification code to user's email"""

    subject = "ROSTIC'S Kitchen - Подтверждение email"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Arial', sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 500px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }}
            .logo {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo span {{
                background: #E4002B;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 18px;
            }}
            h1 {{
                color: #E4002B;
                text-align: center;
                margin-bottom: 20px;
            }}
            .code {{
                background: #f8f8f8;
                border: 3px solid #E4002B;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .code span {{
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #E4002B;
            }}
            p {{
                color: #666;
                line-height: 1.6;
                text-align: center;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: #999;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <span>КУХНЯ ROSTIC'S</span>
            </div>
            <h1>Подтверждение email</h1>
            <p>Привет, шеф! Для завершения регистрации введи код подтверждения:</p>
            <div class="code">
                <span>{code}</span>
            </div>
            <p>Код действителен 5 минут.</p>
            <p>Если ты не регистрировался в игре, просто проигнорируй это письмо.</p>
            <div class="footer">
                ROSTIC'S Kitchen - Так вкусно, что пальчики оближешь!
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    ROSTIC'S Kitchen - Подтверждение email

    Привет, шеф!

    Для завершения регистрации введи код подтверждения: {code}

    Код действителен 5 минут.

    Если ты не регистрировался в игре, просто проигнорируй это письмо.
    """

    # Check if mail is configured
    if not current_app.config.get('MAIL_USERNAME'):
        # TODO: Убрать это когда настроим реальную отправку email (MAIL_USERNAME в .env)
        # Log code for local development - visible in Grafana/Loki
        current_app.logger.warning(f"VERIFICATION_CODE email={email} code={code}")
        return

    msg = Message(
        subject=subject,
        recipients=[email],
        body=text_body,
        html=html_body
    )

    mail.send(msg)


def send_promo_email(email: str, code: str, tier: str = '', discount_label: str = ''):
    """Send promo code to user's email."""

    subject = "ROSTIC'S — Ваш промокод из Космического квеста"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Arial', sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 500px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }}
            .logo {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo span {{
                background: #E4002B;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 18px;
            }}
            h1 {{
                color: #E4002B;
                text-align: center;
                margin-bottom: 20px;
            }}
            .promo {{
                background: #f8f8f8;
                border: 3px solid #FFD700;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .promo span {{
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                color: #E4002B;
            }}
            p {{
                color: #666;
                line-height: 1.6;
                text-align: center;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: #999;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <span>ROSTIC'S</span>
            </div>
            <h1>Ваш промокод</h1>
            <p>Поздравляем с прохождением Космического квеста в Музее космонавтики!</p>
            <div class="promo">
                <span>{code}</span>
            </div>
            <p>Используйте промокод в ресторанах Rostic's.</p>
            <div class="footer">
                © Музей космонавтики, 2026 | © Юнирест
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    ROSTIC'S — Ваш промокод из Космического квеста

    Поздравляем с прохождением квеста!

    Ваш промокод: {code}

    Используйте промокод в ресторанах Rostic's.

    © Музей космонавтики, 2026 | © Юнирест
    """

    if not current_app.config.get('MAIL_USERNAME'):
        current_app.logger.warning(f"PROMO_EMAIL email={email} code={code}")
        return

    msg = Message(
        subject=subject,
        recipients=[email],
        body=text_body,
        html=html_body
    )

    mail.send(msg)
