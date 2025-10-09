# Swagger/OpenAPI Documentation Schemas

Ce dossier contient les définitions de schémas YAML pour la documentation API Swagger/OpenAPI.

## Structure

- **schemas.yaml** - Définitions des modèles de données
- **responses.yaml** - Réponses HTTP réutilisables
- **parameters.yaml** - Paramètres communs (query, path, header)
- **examples.yaml** - Exemples de requêtes et réponses

## Utilisation

Les schémas sont automatiquement chargés par swagger-jsdoc et fusionnés avec la configuration principale dans `src/lib/swagger.ts`.

## Conventions

1. Tous les schémas doivent utiliser OpenAPI 3.0 spec
2. Les noms de schémas utilisent PascalCase (ex: `CreateEventRequest`)
3. Les références utilisent la notation `$ref: '#/components/schemas/SchemaName'`
4. Les types requis sont listés explicitement avec `required: []`
5. Inclure des exemples pour faciliter la compréhension

## Exemple de définition

```yaml
components:
  schemas:
    Event:
      type: object
      required:
        - title
        - date
        - location
      properties:
        id:
          type: string
          format: uuid
          example: "clp1234567890"
        title:
          type: string
          minLength: 3
          maxLength: 100
          example: "Concert de Jazz"
        date:
          type: string
          format: date-time
          example: "2025-12-31T20:00:00Z"
```

## Liens utiles

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Generator](https://openapi-generator.tech/)
