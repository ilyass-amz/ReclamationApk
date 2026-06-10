<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code de réinitialisation</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f4f6fb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 32px 40px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .header span {
            color: #ff4b2b;
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            display: block;
            margin-top: 4px;
        }
        .body {
            padding: 36px 40px;
        }
        .body p {
            color: #374151;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 20px;
        }
        .code-box {
            background: #f0f4ff;
            border: 2px dashed #6366f1;
            border-radius: 10px;
            text-align: center;
            padding: 24px 16px;
            margin: 24px 0;
        }
        .code-box .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .code-box .code {
            font-size: 42px;
            font-weight: 800;
            letter-spacing: 10px;
            color: #1a1a2e;
            font-family: 'Courier New', monospace;
        }
        .expiry {
            background: #fff7ed;
            border-left: 4px solid #f59e0b;
            border-radius: 0 6px 6px 0;
            padding: 10px 14px;
            font-size: 13px;
            color: #92400e;
            margin-bottom: 20px;
        }
        .footer {
            background: #f9fafb;
            padding: 20px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #9ca3af;
            font-size: 12px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ReclaManager</h1>
            <span>Réinitialisation du mot de passe</span>
        </div>
        <div class="body">
            <p>Bonjour <strong>{{ $userName }}</strong>,</p>
            <p>Voici votre code de réinitialisation de mot de passe :</p>

            <div class="code-box">
                <div class="label">Code de vérification</div>
                <div class="code">{{ $code }}</div>
            </div>

            <div class="expiry">
                ⏱ Ce code expire dans <strong>15 minutes</strong>. Ne le partagez avec personne.
            </div>

            <p>Si vous n'avez pas demandé de réinitialisation de mot de passe, ignorez simplement cet e-mail.</p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} ReclaManager · Système de gestion des réclamations</p>
        </div>
    </div>
</body>
</html>
