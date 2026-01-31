"""
Service d'export des données.

Permet d'exporter les documents et statistiques en différents formats :
- CSV : Export tabulaire des transactions
- (Futur) PDF : Rapport mensuel formaté

L'export respecte les filtres de l'utilisateur (dates, tags, etc.)
"""

import csv
import io
from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.models.document import Document
from app.models.item import Item
from app.models.tag import Tag, DocumentTag


class ExportService:
    """
    Service pour générer des exports de données.
    """

    def __init__(self, db: Session, user_id: int):
        """
        Initialise le service d'export.

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur pour filtrer les données
        """
        self.db = db
        self.user_id = user_id

    def export_documents_csv(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        tag_ids: Optional[List[int]] = None,
        include_items: bool = False
    ) -> str:
        """
        Exporte les documents en format CSV.

        Args:
            start_date: Date de début (optionnel)
            end_date: Date de fin (optionnel)
            tag_ids: Liste des IDs de tags pour filtrer (optionnel)
            include_items: Si True, inclut une ligne par article

        Returns:
            Contenu CSV sous forme de chaîne

        Format CSV (sans items):
            ID, Date, Heure, Marchand, Lieu, Type, Montant, Devise, Revenus/Dépense, Tags

        Format CSV (avec items):
            ID Document, Date, Marchand, Article, Quantité, Prix unitaire, Prix total, Catégorie
        """
        # Construire la requête de base
        query = self.db.query(Document).filter(Document.user_id == self.user_id)

        # Appliquer les filtres
        if start_date:
            query = query.filter(Document.date >= start_date)
        if end_date:
            query = query.filter(Document.date <= end_date)
        if tag_ids:
            query = query.join(DocumentTag).filter(DocumentTag.tag_id.in_(tag_ids))

        # Ordonner par date
        query = query.order_by(Document.date.desc(), Document.id.desc())

        documents = query.all()

        # Créer le buffer CSV
        output = io.StringIO()

        if include_items:
            # Export détaillé avec articles
            writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

            # En-tête
            writer.writerow([
                'ID Document',
                'Date',
                'Marchand',
                'Article',
                'Quantité',
                'Unité',
                'Prix unitaire',
                'Prix total',
                'Catégorie article',
                'Tags document'
            ])

            # Données
            for doc in documents:
                # Récupérer les tags du document
                tag_names = ', '.join([t.name for t in doc.tags])

                # Récupérer les items
                items = self.db.query(Item).filter(Item.document_id == doc.id).all()

                if items:
                    for item in items:
                        writer.writerow([
                            doc.id,
                            doc.date.isoformat() if doc.date else '',
                            doc.merchant or '',
                            item.name,
                            self._format_decimal(item.quantity),
                            item.unit or '',
                            self._format_decimal(item.unit_price),
                            self._format_decimal(item.total_price),
                            item.category or '',
                            tag_names
                        ])
                else:
                    # Document sans items - une ligne quand même
                    writer.writerow([
                        doc.id,
                        doc.date.isoformat() if doc.date else '',
                        doc.merchant or '',
                        '(Aucun article)',
                        '',
                        '',
                        '',
                        self._format_decimal(doc.total_amount),
                        '',
                        tag_names
                    ])
        else:
            # Export résumé (une ligne par document)
            writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

            # En-tête
            writer.writerow([
                'ID',
                'Date',
                'Heure',
                'Marchand',
                'Lieu',
                'Type',
                'Montant',
                'Devise',
                'Type transaction',
                'Tags',
                'Fichier original'
            ])

            # Données
            for doc in documents:
                tag_names = ', '.join([t.name for t in doc.tags])
                transaction_type = 'Revenu' if doc.is_income else 'Dépense'

                writer.writerow([
                    doc.id,
                    doc.date.isoformat() if doc.date else '',
                    doc.time.isoformat() if doc.time else '',
                    doc.merchant or '',
                    doc.location or '',
                    doc.doc_type or '',
                    self._format_decimal(doc.total_amount),
                    doc.currency,
                    transaction_type,
                    tag_names,
                    doc.original_name
                ])

        return output.getvalue()

    def export_monthly_summary_csv(self, year: int, month: int) -> str:
        """
        Exporte un résumé mensuel en CSV.

        Args:
            year: Année
            month: Mois (1-12)

        Returns:
            Contenu CSV avec le résumé du mois
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

        # Récupérer les documents du mois
        documents = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            extract('year', Document.date) == year,
            extract('month', Document.date) == month
        ).all()

        # Calculer les totaux
        total_expenses = sum(
            float(d.total_amount or 0) for d in documents if not d.is_income
        )
        total_income = sum(
            float(d.total_amount or 0) for d in documents if d.is_income
        )

        # Résumé général
        writer.writerow(['Résumé mensuel', f'{year}-{month:02d}'])
        writer.writerow([])
        writer.writerow(['Métrique', 'Valeur'])
        writer.writerow(['Total dépenses', f'{total_expenses:.2f} EUR'])
        writer.writerow(['Total revenus', f'{total_income:.2f} EUR'])
        writer.writerow(['Solde', f'{total_income - total_expenses:.2f} EUR'])
        writer.writerow(['Nombre de transactions', len(documents)])
        writer.writerow([])

        # Répartition par tag
        writer.writerow(['Dépenses par catégorie'])
        writer.writerow(['Tag', 'Montant', 'Pourcentage'])

        # Calculer les dépenses par tag
        tag_totals = {}
        for doc in documents:
            if not doc.is_income and doc.total_amount:
                for tag in doc.tags:
                    if tag.name not in tag_totals:
                        tag_totals[tag.name] = 0
                    tag_totals[tag.name] += float(doc.total_amount)

        for tag_name, amount in sorted(tag_totals.items(), key=lambda x: -x[1]):
            percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
            writer.writerow([tag_name, f'{amount:.2f} EUR', f'{percentage:.1f}%'])

        return output.getvalue()

    def _format_decimal(self, value: Optional[Decimal]) -> str:
        """Formate un Decimal pour le CSV."""
        if value is None:
            return ''
        return f'{float(value):.2f}'


def get_export_service(db: Session, user_id: int) -> ExportService:
    """Factory pour créer un service d'export."""
    return ExportService(db, user_id)
