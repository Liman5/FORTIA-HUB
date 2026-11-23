# Homepage — parcours de découverte

## Univers séparés
- **Formations** : `/academy` et `/academy/categories`.
- **Produits numériques** : `/marketplace`, `/marketplace/categories`.
- **Ressources** : `/marketplace/ressources`.
- **Centres** : `/centres` et `/centres/[id]`.
- **Freelances** : `/freelances` et `/freelances/[id]`.

## Corrections principales
- Les catégories de la Homepage sont explicitement celles des **formations**.
- Les cartes produit ouvrent désormais `/product/[slug]` et non plus la boutique filtrée.
- Les centres ouvrent leur fiche dédiée ; plus aucun centre de démonstration.
- Les freelances vérifiés proviennent uniquement des profils réels.
- Les ressources et catégories disposent de pages dédiées.

## Bannières
- La première bannière active (ordre `displayOrder`) reste le hero.
- Les bannières suivantes sont insérées à des emplacements secondaires par ordre d'administration.
- L'ordre et l'activation sont gérés dans l'Admin existant (Bannières du site).

## Limites connues
- L'emplacement exact « après N sections » n'est pas encore stocké en base : l'ordre Admin détermine l'ordre des slots.
- La sélection éditoriale manuelle des produits d'un mini-catalogue n'est pas encore administrable ; la vitrine utilise les produits réels publiés.
