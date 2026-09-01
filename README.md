# ⚡ PayBridge Bénin - Plateforme de Transfert Inter-Réseaux

![PayBridge Bénin](https://img.shields.io/badge/PayBridge-Afrique-1E3A8A?style=for-the-badge&logo=shield)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express)
![SQLite](https://img.shields.io/badge/SQLite3-Database-003B57?style=for-the-badge&logo=sqlite)

**PayBridge Bénin** est une application web moderne et sécurisée permettant de simuler et d'exécuter des transferts d'argent instantanés entre les principaux réseaux Mobile Money du Bénin et d'Afrique de l'Ouest :
- 🟡 **MTN Mobile Money**
- 🔵 **Moov Money**
- 🟢 **Celtiis Cash**
- 🌊 **Wave Afrique**
- 🟠 **Orange Money / TMoney**

---

## 🚀 Fonctionnalités Principales

- **Transferts Inter-Réseaux Instantanés** : Envoi de fonds d'un opérateur vers un autre en calculant automatiquement les frais applicables.
- **Sécurité Rapprochée Backend** :
  - Hachage salé des codes PIN de sécurité via **Bcrypt**.
  - Authentification par jetons **JWT** sécurisés en HTTP-Only Cookies.
  - Protection contre les attaques par force brute avec `express-rate-limit`.
  - Sécurisation des en-têtes HTTP via `helmet`.
- **Simulation de Notifications SMS / Push** :
  - Bannières toast flottantes style smartphone générées lors des transferts.
  - Carillon de notification audio généré via l'**API Web Audio** native.
  - Tiroir **Centre de Notifications 🔔** dans la barre de navigation.
- **Tableau de Bord Administrateur** :
  - Suivi en temps réel de la trésorerie des pools d'opérateurs.
  - Rééquilibrage sécurisé des réserves de liquidité.
  - Historique complet et immutabilité des transactions.

---

## 🛠️ Architecture Technique

```
benin-transfer-app/
├── server/
│   ├── config/          # Connexion SQLite & initialisation des tables
│   ├── controllers/     # Logique métier Auth, Transferts et Admin
│   ├── middleware/      # Middleware JWT, Auth et Rate Limiting
│   ├── routes/          # API v1 (/api/v1/auth, /api/v1/transfer, /api/v1/admin)
│   ├── utils/           # Générateur de SMS officiels par opérateur
│   └── server.js        # Point d'entrée du serveur Express
├── css/                 # Styles Vanilla CSS avec Thème Clair / Sombre
├── js/                  # Modules JS Frontend & SMS Notifications Manager
├── index.html           # Single Page Application
├── render.yaml          # Configuration Render Blueprint
└── package.json         # Dépendances Node.js
```

---

## 💻 Installation & Démarrage Local

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/VOTRE_PSEUDO/paybridge-benin.git
   cd paybridge-benin
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Lancer le serveur** :
   ```bash
   npm start
   ```

4. **Accéder à l'application** :
   Ouvrez votre navigateur sur `http://localhost:3000`.

---

## ☁️ Déploiement sur Render.com

1. Créez un compte sur [Render.com](https://render.com).
2. Cliquez sur **New +** > **Web Service**.
3. Connectez votre dépôt GitHub `paybridge-benin`.
4. Render détecte automatiquement `render.yaml` et déploie votre service en HTTPS gratuit !

---

## 🔒 Comptes de Démonstration

- **Compte Administrateur** :
  - Téléphone : `+229 01 90 00 00`
  - PIN : `2026`
- **Compte Client Démo** :
  - Téléphone : `+229 01 97 12 34 56`
  - PIN : `1234`
