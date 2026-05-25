# 🔐 MANUEL TECHNIQUE SUPRÊME & PROTOCOLES DE SÉCURITÉ - TOTAL LAKAY

Ce document est le pilier central de la souveraineté technologique de **Total Lakay**. Il contient des informations dont la divulgation pourrait compromettre l'intégrité de la plateforme. 

**STRICTEMENT RÉSERVÉ À L'ADMINISTRATION SUPRÊME.**

---

## 🏗️ I. ARCHITECTURE NÉVRALGIQUE (BACKEND & INFRA)

### 1. Le Noyau Firebase (Real-time Ecosystem)
La plateforme utilise une architecture sans serveur (serverless) basée sur Google Firebase.
- **Firestore (NoSQL)** : Les données sont structurées pour minimiser la latence. Chaque document utilisateur contient ses préférences, son historique de navigation et son état de connexion en temps réel.
- **Firebase Auth** : Utilise des jetons JWT sécurisés. Le protocole de vérification d'email est le rempart numéro 1 contre les robots.
- **Storage** : Les images des produits sont servies via un CDN mondial pour un chargement instantané.

### 2. Sécurité des Données & Chiffrement
- **SSL/TLS** : Toutes les communications sont cryptées en 256-bit.
- **Règles Firestore** : La base de données est protégée par des règles granulaires. Un utilisateur ne peut JAMAIS lire les données d'un autre utilisateur. Seuls les comptes avec l'attribut `role: 'admin'` peuvent accéder aux collections globales.

---

## 🤖 II. LE SYSTÈME LAKAYGPT (INTELLIGENCE ARTIFICIELLE)

### 1. Genèse et Évolution
- **Lancement Officiel** : LakayGPT est devenu pleinement fonctionnel le **15 Mai 2026**.
- **Moteur** : Basé sur les derniers modèles de langage de Google (Gemini 1.5/2.5/3.1).
- **Apprentissage Continu** : L'IA analyse les interactions (anonymisées) pour améliorer sa précision linguistique en Kreyòl et Français.

### 2. Confidentialité & Filtrage (Le Mur de Feu)
- **Informations Publiques** : L'IA peut divulguer les prix, les stocks, les délais de livraison et les guides d'utilisation.
- **Informations EXTRÊMEMENT CONFIDENTIELLES** :
    - Clés API (Gemini, MonCash).
    - Revenus précis du site (sauf à l'admin).
    - Mots de passe ou adresses privées des autres clients.
    - Algorithmes de détection de fraude.
**L'IA a pour consigne de refuser toute demande d'accès à ces informations sous peine de verrouillage de session.**

---

## 💳 III. PROTOCOLE DE TRANSACTIONS MONCASH

### 1. L'Intégration API
Le système communique avec les serveurs de la Digicel via un canal sécurisé. 
- **Validation** : Une commande n'est marquée "Konfime" que si le code de retour HTTP de MonCash est `200 OK` avec un hash de transaction valide.
- **Remboursements** : En cas de litige, l'administrateur doit vérifier l'ID de transaction dans le tableau de bord avant toute action manuelle.

---

## 📱 IV. PERFORMANCE & PWA (EDGE COMPUTING)

### 1. Le Service Worker (L'Ombre du Site)
Le fichier `sw.js` intercepte chaque requête.
- **Cache v6+** : Stocke l'intégralité de l'interface utilisateur.
- **Offline First** : Le client peut naviguer dans son historique de commande même dans les zones sans réseau (très important pour les zones reculées d'Haïti).

---

## 🛠️ V. PROCÉDURES D'URGENCE (DRP)

### 1. Fuite de Clé API
Si une clé est compromise :
1. Révoquer la clé dans Google Cloud Console.
2. Générer une nouvelle clé.
3. Mettre à jour immédiatement dans le panneau Admin du site.
4. Vider le cache du site via le Service Worker (incrémenter le numéro de version).

### 2. Panne de Serveur
Firebase garantit un uptime de 99.9%. En cas de ralentissement, vérifiez les quotas de lecture/écriture dans la console Firebase.

---

*Document mis à jour le 15 Mai 2026. Propriété exclusive de Total Lakay.*
