# Projet APP5 Architecture orienté Service
**Goal: Gestionnaire de watch lists multi-plateforme.**

&nbsp;  
## Description
On veut créer une application backend qui permet aux utilisateurs de créer et gérer des collections de médias (films, séries, livres, articles, etc.) qu'ils souhaitent regarder/lire peut importe la plateforme. La collaboration est au coeur de l'application (partage, edition des collections). On veut avoir les fonctionnalités suivantes:
- Authentification
- 

&nbsp;  
## Getting Started
1. Clone the repository
2. Install dependencies with `bun install`
3. Set up the database client with `bunx --bun prisma generate`
4. Add the environment variables in a `.env` file (see `.env.example`)
5. Run the development server with `bun run dev`

&nbsp;  
## P1
- [ ] Database schema
- [ ] Database seeding
- [ ] API endpoints for CRUD operations on Media, Collections, and Users (with all HTTP verbs, pagination, filtering, navigation, validation)
  - [x] Setup Hono et Bun (with routes, validation, error handling)
  - [ ] Implement API endpoints (CRUD for Media, Collections, Users)
  - [ ] Implement pagination, filtering, and navigation for listing endpoints
  - [ ] Implement validation with Zod for request bodies and query parameters
- [x] Setup Better-auth
- [ ] Dockerize
- [ ] Tests (unitaires, postman)
- [ ] OpenAPI

## P2
- [ ] gestion des droits d'accès (collaborateurs, lecteurs)
- [ ] regex sur le titre
- [ ] filtrage multi-tags
- [ ] note du film/série

## P3 (bonus)
- [ ] Collection Parent (pour les sous-collections)
- [ ] priorité de visionnage
- [ ] CI/CD
- [ ] Front-end

## P4 (bonus bonus)
- [ ] Recommandations basées sur les tags et les notes
- [ ] Intégration avec des APIs externes (ex: IMDb, Goodreads, etc.)
- [ ] Rate limiting


&nbsp;  
&nbsp;  
## Stack
- Runtime: Bun
- Framework: Hono
- Validation: Zod
- ORM: Prisma
- Database: Postgres
- Containerization: Docker
- CI/CD: GitHub Actions
- Authentication: Better-Auth


&nbsp;  
&nbsp;  
## DataModel
**Media** (films, séries, livres, articles, etc.) avec des champs tels que :
- Titre *string*
- Description/synopsis *string*
- Type *enum* (film, série, livre, article, etc.)
- Genre(s) *string list* (ex: "sci-fi", "drame", "comédie", etc.)
- Année de sortie *date*
- Réalisateur/Auteur *string*
- Tags *string list* (ex: "sci-fi", "drame", "comédie", etc.)
- Availability/plateforme *string list* (ex: Netflix, Amazon Prime, etc.)
- Scores/notes *string* (ex: IMDb, Rotten Tomatoes, etc.)

**Collections** (watch lists) avec des champs tels que :
- Nom de la collection  *string*
- Description *string*
- Tags *string list* (ex: "films à voir", "séries à binge-watcher", etc.)
- Date de création *date*
- Date de mise à jour *date*
- Visibilité *enum* (publique/privée)
- Owner *User* clé étrangère (relation vers l'utilisateur qui a créé la collection)


**Users** avec des champs tels que :
- Nom d'utilisateur *string*
- Email *string*
...


Associations :
- Media 0-n Collections
- Collection 0-n Media
- User 0-n Collections
- Collection 0-n Users (collaborateurs/lecteurs) - table intermédiaire

