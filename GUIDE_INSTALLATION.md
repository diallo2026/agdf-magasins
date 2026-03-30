# AGDF — Guide d'installation du serveur centralisé

## Ce que ça fait
Un seul ordinateur fait tourner le serveur.
Tous les magasins (tôle, ciment, carreaux, fer, tubes) + le fondateur
se connectent depuis n'importe quel appareil sur le même WiFi.
Toutes les données sont partagées en temps réel.

---

## ÉTAPE 1 — Installer Node.js (une seule fois)

1. Allez sur : **https://nodejs.org**
2. Cliquez sur le bouton vert **LTS**
3. Installez le fichier téléchargé (Suivant → Suivant → Terminer)
4. Vérification : ouvrez le terminal et tapez :
   ```
   node --version
   ```
   Vous devez voir : `v20.x.x` ou similaire ✅

---

## ÉTAPE 2 — Installer les fichiers

1. Extrayez le fichier **agdf_server.zip** sur votre Bureau
2. Vous obtenez un dossier `agdf_server` contenant :
   ```
   agdf_server/
   ├── server.js          ← Le serveur
   ├── package.json       ← Configuration
   ├── public/
   │   └── index.html     ← L'application web
   └── data/              ← Base de données (créée automatiquement)
   ```

---

## ÉTAPE 3 — Installer Express (une seule fois)

Ouvrez le terminal :
- Windows : `Windows + R` → tapez `cmd` → Enter

Naviguez vers le dossier :
```
cd %USERPROFILE%\Desktop\agdf_server
```

Installez Express :
```
npm install
```
Attendez la fin (quelques secondes).

---

## ÉTAPE 4 — Démarrer le serveur

Dans le terminal, tapez :
```
node server.js
```

Vous verrez :
```
╔═══════════════════════════════════════════════════════╗
║     Ets. Abdoul Gadirou Diallo et Frères (AGDF)       ║
║                Serveur centralisé v1.0                ║
╠═══════════════════════════════════════════════════════╣
║  Accès local :   http://localhost:3000                ║
║  Accès réseau :  http://192.168.1.XX:3000             ║
╚═══════════════════════════════════════════════════════╝
```

---

## ÉTAPE 5 — Ouvrir l'application

**Sur l'ordinateur serveur :**
→ Ouvrez Chrome et allez sur : `http://localhost:3000`

**Sur les autres appareils (téléphones, tablettes, autres PC) :**
→ Connectez-les au même WiFi
→ Ouvrez le navigateur et tapez l'adresse réseau affichée
→ Exemple : `http://192.168.1.15:3000`

---

## Identifiants et mots de passe

| Identifiant        | Mot de passe | Accès                        |
|--------------------|-------------|------------------------------|
| fondateur          | FOND2026    | Supervision + répartition    |
| employe_tole       | EMP001      | Magasin de tôle              |
| employe_ciment     | EMP002      | Magasin de ciment            |
| employe_carraux    | EMP003      | Magasin de carreaux          |
| employe_fer        | EMP004      | Magasin de fer               |
| employe_tube       | EMP005      | Magasin de tubes carrés      |
| concepteur         | DEV9999     | Accès système complet        |

Le Fondateur peut changer les mots de passe depuis son menu "Codes d'accès".

---

## Données et sauvegarde

Les données sont dans : `agdf_server/data/database.json`

**Sauvegarde manuelle :** copiez le dossier `data/` régulièrement.

**Sauvegarde automatique :** connectez-vous en tant que Fondateur
ou Concepteur → Admin système → "Exporter toutes les données (JSON)"

---

## Trouver l'adresse IP de votre ordinateur

**Windows :**
1. Ouvrez `cmd`
2. Tapez : `ipconfig`
3. Cherchez **Adresse IPv4** sous "Carte réseau sans fil Wi-Fi"
4. Exemple : `192.168.1.15`

**L'adresse s'affiche aussi directement au démarrage du serveur.**

---

## Arrêter le serveur

Dans le terminal : appuyez sur `Ctrl + C`

## Redémarrer le serveur

```
node server.js
```

---

## En cas de problème

| Problème                        | Solution                                      |
|---------------------------------|-----------------------------------------------|
| "node n'est pas reconnu"        | Réinstaller Node.js depuis nodejs.org         |
| "Cannot find module 'express'"  | Relancer `npm install` dans le dossier        |
| Page inaccessible depuis iPhone | Vérifier que le WiFi est le même              |
| Connexion refusée               | Vérifier que `node server.js` tourne          |
| Pare-feu bloque                 | Autoriser Node.js dans le pare-feu Windows    |

Pour tout problème technique : contactez le Concepteur (DEV9999).
