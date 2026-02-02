"""
Service de génération de rapports PDF avec graphiques.

Utilise ReportLab pour la génération PDF et Matplotlib pour les graphiques.

Fonctionnalités:
- Rapport mensuel PDF avec graphiques
- Rapport annuel PDF récapitulatif
- Export de graphiques individuels en PNG
"""

import io
import calendar
from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

import matplotlib
matplotlib.use('Agg')  # Backend sans GUI
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge
import numpy as np

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, cast, Date

from app.models.document import Document
from app.models.item import Item
from app.models.tag import Tag, DocumentTag
from app.models.budget import Budget


def hex_to_rgb(hex_color: str) -> Tuple[float, float, float]:
    """Convertit une couleur hex (#RRGGBB) en tuple RGB normalisé (0-1)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))


def get_effective_date():
    """Retourne une expression SQL pour la date effective du document."""
    return func.coalesce(Document.date, cast(Document.created_at, Date))


class PDFReportService:
    """
    Service de génération de rapports PDF avec graphiques.
    """

    # Palette de couleurs par défaut si les tags n'ont pas de couleur
    DEFAULT_COLORS = [
        '#3B82F6',  # Bleu
        '#10B981',  # Vert
        '#F59E0B',  # Orange
        '#EF4444',  # Rouge
        '#8B5CF6',  # Violet
        '#EC4899',  # Rose
        '#06B6D4',  # Cyan
        '#84CC16',  # Lime
        '#F97316',  # Orange vif
        '#6366F1',  # Indigo
    ]

    # Noms des mois en français
    MONTH_NAMES = [
        '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    def __init__(self, db: Session, user_id: int):
        """
        Initialise le service PDF.

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur
        """
        self.db = db
        self.user_id = user_id
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Configure les styles personnalisés pour les PDF."""
        # Titre principal
        self.styles.add(ParagraphStyle(
            name='MainTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1F2937')
        ))

        # Sous-titre
        self.styles.add(ParagraphStyle(
            name='SubTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.HexColor('#374151')
        ))

        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceAfter=8,
            spaceBefore=12,
            textColor=colors.HexColor('#4B5563'),
            borderPadding=(0, 0, 5, 0)
        ))

        # Texte normal
        self.styles.add(ParagraphStyle(
            name='BodyTextCustom',
            parent=self.styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#374151')
        ))

        # Valeurs mises en évidence
        self.styles.add(ParagraphStyle(
            name='HighlightValue',
            parent=self.styles['BodyText'],
            fontSize=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1F2937'),
            fontName='Helvetica-Bold'
        ))

        # Petit texte
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['BodyText'],
            fontSize=8,
            textColor=colors.HexColor('#6B7280')
        ))

    # =========================================================================
    # Méthodes de génération de graphiques (Matplotlib → bytes PNG)
    # =========================================================================

    def _generate_pie_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        width: int = 400,
        height: int = 300
    ) -> bytes:
        """
        Génère un graphique camembert.

        Args:
            data: Liste de dicts avec 'name', 'value', 'color'
            title: Titre du graphique
            width: Largeur en pixels
            height: Hauteur en pixels

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['name'] for d in data]
        values = [float(d['value']) for d in data]
        colors_list = [d.get('color', self.DEFAULT_COLORS[i % len(self.DEFAULT_COLORS)])
                      for i, d in enumerate(data)]

        # Créer le camembert
        wedges, texts, autotexts = ax.pie(
            values,
            labels=labels,
            colors=colors_list,
            autopct='%1.1f%%',
            startangle=90,
            pctdistance=0.75
        )

        # Style des textes
        for text in texts:
            text.set_fontsize(9)
        for autotext in autotexts:
            autotext.set_fontsize(8)
            autotext.set_color('white')

        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_donut_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        width: int = 400,
        height: int = 300
    ) -> bytes:
        """
        Génère un graphique en anneau (donut).

        Args:
            data: Liste de dicts avec 'name', 'value', 'color'
            title: Titre du graphique
            width: Largeur en pixels
            height: Hauteur en pixels

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['name'] for d in data]
        values = [float(d['value']) for d in data]
        colors_list = [d.get('color', self.DEFAULT_COLORS[i % len(self.DEFAULT_COLORS)])
                      for i, d in enumerate(data)]

        # Créer le donut
        wedges, texts, autotexts = ax.pie(
            values,
            colors=colors_list,
            autopct='%1.1f%%',
            startangle=90,
            pctdistance=0.80,
            wedgeprops=dict(width=0.5)  # Crée le trou central
        )

        # Style des textes
        for autotext in autotexts:
            autotext.set_fontsize(8)
            autotext.set_color('white')
            autotext.set_fontweight('bold')

        # Légende à droite
        ax.legend(
            wedges, labels,
            title="Catégories",
            loc="center left",
            bbox_to_anchor=(1, 0, 0.5, 1),
            fontsize=8
        )

        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_bar_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        x_label: str = "",
        y_label: str = "",
        width: int = 500,
        height: int = 300,
        show_values: bool = True
    ) -> bytes:
        """
        Génère un graphique en barres verticales.

        Args:
            data: Liste de dicts avec 'label', 'value', optionnel 'color'
            title: Titre du graphique
            x_label: Label axe X
            y_label: Label axe Y
            width: Largeur en pixels
            height: Hauteur en pixels
            show_values: Afficher les valeurs sur les barres

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['label'] for d in data]
        values = [float(d['value']) for d in data]
        colors_list = [d.get('color', '#3B82F6') for d in data]

        x = np.arange(len(labels))
        bars = ax.bar(x, values, color=colors_list, width=0.6)

        ax.set_xlabel(x_label, fontsize=10)
        ax.set_ylabel(y_label, fontsize=10)
        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=8)

        # Valeurs sur les barres
        if show_values:
            for bar, value in zip(bars, values):
                height_val = bar.get_height()
                ax.annotate(
                    f'{value:.0f}€',
                    xy=(bar.get_x() + bar.get_width() / 2, height_val),
                    xytext=(0, 3),
                    textcoords="offset points",
                    ha='center', va='bottom',
                    fontsize=8
                )

        # Grille horizontale légère
        ax.yaxis.grid(True, linestyle='--', alpha=0.3)
        ax.set_axisbelow(True)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_grouped_bar_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        width: int = 600,
        height: int = 300
    ) -> bytes:
        """
        Génère un graphique en barres groupées (dépenses vs revenus).

        Args:
            data: Liste de dicts avec 'label', 'expenses', 'income'
            title: Titre du graphique
            width: Largeur en pixels
            height: Hauteur en pixels

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['label'] for d in data]
        expenses = [float(d.get('expenses', 0)) for d in data]
        income = [float(d.get('income', 0)) for d in data]

        x = np.arange(len(labels))
        bar_width = 0.35

        bars1 = ax.bar(x - bar_width/2, expenses, bar_width, label='Dépenses', color='#EF4444')
        bars2 = ax.bar(x + bar_width/2, income, bar_width, label='Revenus', color='#10B981')

        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=8)
        ax.legend(fontsize=9)

        # Grille horizontale légère
        ax.yaxis.grid(True, linestyle='--', alpha=0.3)
        ax.set_axisbelow(True)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_line_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        x_label: str = "",
        y_label: str = "",
        width: int = 600,
        height: int = 300,
        show_expenses: bool = True,
        show_income: bool = True
    ) -> bytes:
        """
        Génère un graphique en ligne.

        Args:
            data: Liste de dicts avec 'label', 'expenses', 'income'
            title: Titre du graphique
            x_label: Label axe X
            y_label: Label axe Y
            width: Largeur en pixels
            height: Hauteur en pixels
            show_expenses: Afficher la ligne des dépenses
            show_income: Afficher la ligne des revenus

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['label'] for d in data]
        x = np.arange(len(labels))

        if show_expenses:
            expenses = [float(d.get('expenses', 0)) for d in data]
            ax.plot(x, expenses, marker='o', label='Dépenses', color='#EF4444', linewidth=2)

        if show_income:
            income = [float(d.get('income', 0)) for d in data]
            ax.plot(x, income, marker='s', label='Revenus', color='#10B981', linewidth=2)

        ax.set_xlabel(x_label, fontsize=10)
        ax.set_ylabel(y_label, fontsize=10)
        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=8)
        ax.legend(fontsize=9)

        # Grille
        ax.grid(True, linestyle='--', alpha=0.3)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_horizontal_bar_chart(
        self,
        data: List[Dict[str, Any]],
        title: str,
        width: int = 500,
        height: int = 300
    ) -> bytes:
        """
        Génère un graphique en barres horizontales.

        Args:
            data: Liste de dicts avec 'label', 'value', optionnel 'color'
            title: Titre du graphique
            width: Largeur en pixels
            height: Hauteur en pixels

        Returns:
            Image PNG en bytes
        """
        if not data:
            return self._generate_empty_chart("Aucune donnée", width, height)

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        labels = [d['label'] for d in data]
        values = [float(d['value']) for d in data]
        colors_list = [d.get('color', '#3B82F6') for d in data]

        y = np.arange(len(labels))
        bars = ax.barh(y, values, color=colors_list, height=0.6)

        ax.set_yticks(y)
        ax.set_yticklabels(labels, fontsize=9)
        ax.set_title(title, fontsize=12, fontweight='bold', pad=10)

        # Valeurs à droite des barres
        for bar, value in zip(bars, values):
            ax.annotate(
                f'{value:.0f}€',
                xy=(bar.get_width(), bar.get_y() + bar.get_height() / 2),
                xytext=(5, 0),
                textcoords="offset points",
                ha='left', va='center',
                fontsize=8
            )

        # Grille verticale légère
        ax.xaxis.grid(True, linestyle='--', alpha=0.3)
        ax.set_axisbelow(True)

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def _generate_empty_chart(self, message: str, width: int, height: int) -> bytes:
        """Génère un graphique vide avec un message."""
        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)
        ax.text(0.5, 0.5, message, ha='center', va='center',
               fontsize=14, color='#9CA3AF')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    # =========================================================================
    # Méthodes de récupération des données
    # =========================================================================

    def _get_monthly_summary(self, year: int, month: int) -> Dict[str, Any]:
        """Récupère le résumé du mois."""
        effective_date = get_effective_date()

        base_query = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            extract("year", effective_date) == year,
            extract("month", effective_date) == month
        )

        expenses = base_query.filter(Document.is_income == False).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        income = base_query.filter(Document.is_income == True).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        count = base_query.count()

        # Mois précédent pour comparaison
        if month == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month - 1

        prev_query = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            extract("year", effective_date) == prev_year,
            extract("month", effective_date) == prev_month
        )

        prev_expenses = prev_query.filter(Document.is_income == False).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        prev_income = prev_query.filter(Document.is_income == True).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        # Calcul des variations
        expense_change = None
        income_change = None
        if float(prev_expenses) > 0:
            expense_change = round((float(expenses) - float(prev_expenses)) / float(prev_expenses) * 100, 1)
        if float(prev_income) > 0:
            income_change = round((float(income) - float(prev_income)) / float(prev_income) * 100, 1)

        return {
            'expenses': Decimal(str(expenses)),
            'income': Decimal(str(income)),
            'balance': Decimal(str(income)) - Decimal(str(expenses)),
            'transaction_count': count,
            'expense_change': expense_change,
            'income_change': income_change,
            'savings_rate': round(float(Decimal(str(income)) - Decimal(str(expenses))) / float(income) * 100, 1) if float(income) > 0 else 0
        }

    def _get_tag_spending(self, year: int, month: int) -> List[Dict[str, Any]]:
        """Récupère les dépenses par tag pour un mois."""
        effective_date = get_effective_date()

        results = self.db.query(
            Tag.id,
            Tag.name,
            Tag.color,
            func.coalesce(func.sum(Document.total_amount), 0).label("total")
        ).join(
            DocumentTag, Tag.id == DocumentTag.tag_id
        ).join(
            Document, DocumentTag.document_id == Document.id
        ).filter(
            Tag.user_id == self.user_id,
            Document.is_income == False,
            extract("year", effective_date) == year,
            extract("month", effective_date) == month
        ).group_by(
            Tag.id, Tag.name, Tag.color
        ).order_by(
            func.sum(Document.total_amount).desc()
        ).all()

        return [
            {
                'name': r.name,
                'value': float(r.total),
                'color': r.color or self.DEFAULT_COLORS[i % len(self.DEFAULT_COLORS)]
            }
            for i, r in enumerate(results)
        ]

    def _get_monthly_evolution(self, months: int = 6) -> List[Dict[str, Any]]:
        """Récupère l'évolution sur N mois."""
        effective_date = get_effective_date()

        results = self.db.query(
            func.to_char(effective_date, 'YYYY-MM').label("month"),
            func.sum(
                case(
                    (Document.is_income == False, Document.total_amount),
                    else_=0
                )
            ).label("expenses"),
            func.sum(
                case(
                    (Document.is_income == True, Document.total_amount),
                    else_=0
                )
            ).label("income")
        ).filter(
            Document.user_id == self.user_id
        ).group_by(
            func.to_char(effective_date, 'YYYY-MM')
        ).order_by(
            func.to_char(effective_date, 'YYYY-MM').desc()
        ).limit(months).all()

        return [
            {
                'label': r.month,
                'expenses': float(r.expenses or 0),
                'income': float(r.income or 0)
            }
            for r in reversed(results)
        ]

    def _get_top_expenses(self, year: int, month: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Récupère les plus grosses dépenses du mois."""
        effective_date = get_effective_date()

        results = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            Document.is_income == False,
            Document.total_amount.isnot(None),
            extract("year", effective_date) == year,
            extract("month", effective_date) == month
        ).order_by(
            Document.total_amount.desc()
        ).limit(limit).all()

        return [
            {
                'label': doc.merchant or f"Document #{doc.id}",
                'value': float(doc.total_amount),
                'date': doc.date.isoformat() if doc.date else None
            }
            for doc in results
        ]

    def _get_top_merchants(self, year: int, month: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Récupère les marchands avec le plus de dépenses."""
        effective_date = get_effective_date()

        results = self.db.query(
            Document.merchant,
            func.sum(Document.total_amount).label("total"),
            func.count(Document.id).label("count")
        ).filter(
            Document.user_id == self.user_id,
            Document.is_income == False,
            Document.merchant.isnot(None),
            Document.merchant != "",
            extract("year", effective_date) == year,
            extract("month", effective_date) == month
        ).group_by(
            Document.merchant
        ).order_by(
            func.sum(Document.total_amount).desc()
        ).limit(limit).all()

        return [
            {
                'label': r.merchant,
                'value': float(r.total),
                'count': r.count
            }
            for r in results
        ]

    def _get_budgets_progress(self, year: int, month: int) -> List[Dict[str, Any]]:
        """Récupère la progression des budgets du mois."""
        month_str = f"{year}-{month:02d}"
        effective_date = get_effective_date()

        # Récupérer les budgets du mois
        budgets = self.db.query(Budget).filter(
            Budget.user_id == self.user_id,
            Budget.month == month_str
        ).all()

        results = []
        for budget in budgets:
            # Calculer les dépenses pour ce tag
            spent = self.db.query(
                func.coalesce(func.sum(Document.total_amount), 0)
            ).join(
                DocumentTag, Document.id == DocumentTag.document_id
            ).filter(
                Document.user_id == self.user_id,
                Document.is_income == False,
                DocumentTag.tag_id == budget.tag_id,
                extract("year", effective_date) == year,
                extract("month", effective_date) == month
            ).scalar()

            tag = self.db.query(Tag).filter(Tag.id == budget.tag_id).first()

            if tag:
                progress = round(float(spent) / float(budget.limit_amount) * 100, 1) if float(budget.limit_amount) > 0 else 0
                results.append({
                    'name': tag.name,
                    'color': tag.color or '#3B82F6',
                    'spent': float(spent),
                    'limit': float(budget.limit_amount),
                    'progress': min(progress, 100),
                    'over_budget': progress > 100
                })

        return results

    def _get_recurring_expenses(self, year: int, month: int) -> List[Dict[str, Any]]:
        """Récupère les dépenses récurrentes du mois."""
        effective_date = get_effective_date()

        results = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            Document.is_income == False,
            Document.is_recurring == True,
            extract("year", effective_date) == year,
            extract("month", effective_date) == month
        ).order_by(
            Document.total_amount.desc()
        ).all()

        return [
            {
                'name': doc.merchant or f"Document #{doc.id}",
                'amount': float(doc.total_amount or 0),
                'frequency': doc.recurring_frequency or 'monthly'
            }
            for doc in results
        ]

    def _get_annual_summary(self, year: int) -> Dict[str, Any]:
        """Récupère le résumé annuel."""
        effective_date = get_effective_date()

        base_query = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            extract("year", effective_date) == year
        )

        expenses = base_query.filter(Document.is_income == False).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        income = base_query.filter(Document.is_income == True).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        count = base_query.count()

        return {
            'year': year,
            'expenses': Decimal(str(expenses)),
            'income': Decimal(str(income)),
            'balance': Decimal(str(income)) - Decimal(str(expenses)),
            'transaction_count': count,
            'savings_rate': round(float(Decimal(str(income)) - Decimal(str(expenses))) / float(income) * 100, 1) if float(income) > 0 else 0
        }

    def _get_annual_evolution(self, year: int) -> List[Dict[str, Any]]:
        """Récupère l'évolution mois par mois pour une année."""
        effective_date = get_effective_date()

        results = self.db.query(
            func.to_char(effective_date, 'MM').label("month_num"),
            func.sum(
                case(
                    (Document.is_income == False, Document.total_amount),
                    else_=0
                )
            ).label("expenses"),
            func.sum(
                case(
                    (Document.is_income == True, Document.total_amount),
                    else_=0
                )
            ).label("income")
        ).filter(
            Document.user_id == self.user_id,
            extract("year", effective_date) == year
        ).group_by(
            func.to_char(effective_date, 'MM')
        ).order_by(
            func.to_char(effective_date, 'MM')
        ).all()

        # Créer un dict pour accès rapide
        data_by_month = {
            int(r.month_num): {'expenses': float(r.expenses or 0), 'income': float(r.income or 0)}
            for r in results
        }

        # Retourner tous les mois (même vides)
        return [
            {
                'label': self.MONTH_NAMES[m][:3],
                'month': m,
                'expenses': data_by_month.get(m, {}).get('expenses', 0),
                'income': data_by_month.get(m, {}).get('income', 0)
            }
            for m in range(1, 13)
        ]

    def _get_annual_tag_spending(self, year: int) -> List[Dict[str, Any]]:
        """Récupère les dépenses par tag pour une année."""
        effective_date = get_effective_date()

        results = self.db.query(
            Tag.id,
            Tag.name,
            Tag.color,
            func.coalesce(func.sum(Document.total_amount), 0).label("total")
        ).join(
            DocumentTag, Tag.id == DocumentTag.tag_id
        ).join(
            Document, DocumentTag.document_id == Document.id
        ).filter(
            Tag.user_id == self.user_id,
            Document.is_income == False,
            extract("year", effective_date) == year
        ).group_by(
            Tag.id, Tag.name, Tag.color
        ).order_by(
            func.sum(Document.total_amount).desc()
        ).all()

        return [
            {
                'name': r.name,
                'value': float(r.total),
                'color': r.color or self.DEFAULT_COLORS[i % len(self.DEFAULT_COLORS)]
            }
            for i, r in enumerate(results)
        ]

    # =========================================================================
    # Méthodes de génération de rapports PDF
    # =========================================================================

    def generate_monthly_report(self, year: int, month: int) -> bytes:
        """
        Génère le rapport PDF mensuel complet.

        Args:
            year: Année
            month: Mois (1-12)

        Returns:
            PDF en bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        elements = []

        # Récupérer les données
        summary = self._get_monthly_summary(year, month)
        tag_spending = self._get_tag_spending(year, month)
        monthly_evolution = self._get_monthly_evolution(6)
        top_expenses = self._get_top_expenses(year, month, 5)
        top_merchants = self._get_top_merchants(year, month, 5)
        budgets_progress = self._get_budgets_progress(year, month)
        recurring = self._get_recurring_expenses(year, month)

        # === TITRE ===
        month_name = self.MONTH_NAMES[month]
        elements.append(Paragraph(f"BILAN FINANCIER", self.styles['MainTitle']))
        elements.append(Paragraph(f"{month_name} {year}", self.styles['SubTitle']))
        elements.append(Paragraph(
            f"Généré le {date.today().strftime('%d/%m/%Y')}",
            self.styles['SmallText']
        ))
        elements.append(Spacer(1, 20))

        # === RÉSUMÉ DU MOIS ===
        elements.append(Paragraph("RÉSUMÉ DU MOIS", self.styles['SectionHeader']))

        # Tableau résumé
        summary_data = [
            ['Dépenses', 'Revenus', 'Solde', 'Épargne'],
            [
                f"{float(summary['expenses']):.2f} €",
                f"{float(summary['income']):.2f} €",
                f"{'+' if summary['balance'] >= 0 else ''}{float(summary['balance']):.2f} €",
                f"{summary['savings_rate']:.0f}%"
            ],
            [
                f"{'+' if summary['expense_change'] and summary['expense_change'] > 0 else ''}{summary['expense_change']:.1f}%" if summary['expense_change'] is not None else "—",
                f"{'+' if summary['income_change'] and summary['income_change'] > 0 else ''}{summary['income_change']:.1f}%" if summary['income_change'] is not None else "—",
                "",
                ""
            ]
        ]

        summary_table = Table(summary_data, colWidths=[4*cm, 4*cm, 4*cm, 3*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, 1), 14),
            ('FONTSIZE', (0, 2), (-1, 2), 8),
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#6B7280')),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, 1), 15),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # === RÉPARTITION PAR CATÉGORIE ===
        if tag_spending:
            elements.append(Paragraph("RÉPARTITION PAR CATÉGORIE", self.styles['SectionHeader']))

            # Graphique donut
            donut_bytes = self._generate_donut_chart(
                tag_spending,
                "",
                width=450,
                height=250
            )
            elements.append(Image(io.BytesIO(donut_bytes), width=15*cm, height=8.5*cm))
            elements.append(Spacer(1, 10))

            # Tableau détaillé
            total_spent = sum(d['value'] for d in tag_spending)
            tag_table_data = [['Catégorie', 'Montant', '%']]
            for d in tag_spending[:8]:  # Max 8 lignes
                pct = (d['value'] / total_spent * 100) if total_spent > 0 else 0
                tag_table_data.append([d['name'], f"{d['value']:.2f} €", f"{pct:.1f}%"])

            tag_table = Table(tag_table_data, colWidths=[8*cm, 4*cm, 3*cm])
            tag_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ]))
            elements.append(tag_table)
            elements.append(Spacer(1, 20))

        # === ÉVOLUTION MENSUELLE ===
        if monthly_evolution:
            elements.append(Paragraph("ÉVOLUTION SUR 6 MOIS", self.styles['SectionHeader']))

            evolution_bytes = self._generate_grouped_bar_chart(
                monthly_evolution,
                "",
                width=550,
                height=250
            )
            elements.append(Image(io.BytesIO(evolution_bytes), width=16*cm, height=7.5*cm))
            elements.append(Spacer(1, 20))

        # === TOP DÉPENSES & MARCHANDS (côte à côte) ===
        if top_expenses or top_merchants:
            elements.append(Paragraph("TOP 5 DÉPENSES ET MARCHANDS", self.styles['SectionHeader']))

            # Créer deux colonnes
            left_data = [['Top Dépenses', 'Montant']]
            for exp in top_expenses:
                left_data.append([exp['label'][:25], f"{exp['value']:.2f} €"])

            right_data = [['Top Marchands', 'Montant']]
            for m in top_merchants:
                right_data.append([m['label'][:25], f"{m['value']:.2f} €"])

            # Padding si nécessaire
            while len(left_data) < 6:
                left_data.append(['', ''])
            while len(right_data) < 6:
                right_data.append(['', ''])

            left_table = Table(left_data, colWidths=[5*cm, 2.5*cm])
            right_table = Table(right_data, colWidths=[5*cm, 2.5*cm])

            table_style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ])

            left_table.setStyle(table_style)
            right_table.setStyle(table_style)

            combined_table = Table([[left_table, right_table]], colWidths=[8*cm, 8*cm])
            elements.append(combined_table)
            elements.append(Spacer(1, 20))

        # === SUIVI DES BUDGETS ===
        if budgets_progress:
            elements.append(Paragraph("SUIVI DES BUDGETS", self.styles['SectionHeader']))

            budget_data = [['Catégorie', 'Dépensé', 'Budget', 'Progression']]
            for b in budgets_progress:
                status = "⚠️" if b['over_budget'] else "✓"
                budget_data.append([
                    b['name'],
                    f"{b['spent']:.2f} €",
                    f"{b['limit']:.2f} €",
                    f"{b['progress']:.0f}% {status}"
                ])

            budget_table = Table(budget_data, colWidths=[5*cm, 3.5*cm, 3.5*cm, 3*cm])
            budget_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ]))
            elements.append(budget_table)
            elements.append(Spacer(1, 20))

        # === CHARGES FIXES ===
        if recurring:
            elements.append(Paragraph("CHARGES FIXES (RÉCURRENT)", self.styles['SectionHeader']))

            recurring_total = sum(r['amount'] for r in recurring)
            recurring_text = " • ".join([f"{r['name']} {r['amount']:.0f}€" for r in recurring[:6]])
            elements.append(Paragraph(recurring_text, self.styles['BodyTextCustom']))
            elements.append(Paragraph(f"Total: {recurring_total:.2f} €/mois", self.styles['BodyTextCustom']))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_annual_report(self, year: int) -> bytes:
        """
        Génère le rapport PDF annuel récapitulatif.

        Args:
            year: Année

        Returns:
            PDF en bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        elements = []

        # Récupérer les données
        summary = self._get_annual_summary(year)
        monthly_evolution = self._get_annual_evolution(year)
        tag_spending = self._get_annual_tag_spending(year)
        top_expenses = self._get_top_expenses(year, None, 10)  # Annuel
        top_merchants = self._get_top_merchants(year, None, 10)

        # Pour top annuel, on modifie les requêtes
        effective_date = get_effective_date()

        # Top expenses annuel
        top_expenses_annual = self.db.query(Document).filter(
            Document.user_id == self.user_id,
            Document.is_income == False,
            Document.total_amount.isnot(None),
            extract("year", effective_date) == year
        ).order_by(
            Document.total_amount.desc()
        ).limit(10).all()

        top_expenses = [
            {'label': doc.merchant or f"Document #{doc.id}", 'value': float(doc.total_amount)}
            for doc in top_expenses_annual
        ]

        # Top merchants annuel
        top_merchants_annual = self.db.query(
            Document.merchant,
            func.sum(Document.total_amount).label("total")
        ).filter(
            Document.user_id == self.user_id,
            Document.is_income == False,
            Document.merchant.isnot(None),
            Document.merchant != "",
            extract("year", effective_date) == year
        ).group_by(Document.merchant).order_by(
            func.sum(Document.total_amount).desc()
        ).limit(10).all()

        top_merchants = [
            {'label': r.merchant, 'value': float(r.total)}
            for r in top_merchants_annual
        ]

        # === TITRE ===
        elements.append(Paragraph(f"BILAN ANNUEL {year}", self.styles['MainTitle']))
        elements.append(Paragraph(
            f"Généré le {date.today().strftime('%d/%m/%Y')}",
            self.styles['SmallText']
        ))
        elements.append(Spacer(1, 20))

        # === RÉSUMÉ DE L'ANNÉE ===
        elements.append(Paragraph("RÉSUMÉ DE L'ANNÉE", self.styles['SectionHeader']))

        summary_data = [
            ['Dépenses totales', 'Revenus totaux', 'Solde annuel', 'Taux d\'épargne'],
            [
                f"{float(summary['expenses']):.2f} €",
                f"{float(summary['income']):.2f} €",
                f"{'+' if summary['balance'] >= 0 else ''}{float(summary['balance']):.2f} €",
                f"{summary['savings_rate']:.0f}%"
            ]
        ]

        summary_table = Table(summary_data, colWidths=[4*cm, 4*cm, 4*cm, 3*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, 1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, 1), 15),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 15),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # === ÉVOLUTION MENSUELLE ===
        elements.append(Paragraph("ÉVOLUTION MENSUELLE", self.styles['SectionHeader']))

        evolution_bytes = self._generate_line_chart(
            monthly_evolution,
            "",
            width=550,
            height=250
        )
        elements.append(Image(io.BytesIO(evolution_bytes), width=16*cm, height=7.5*cm))
        elements.append(Spacer(1, 15))

        # Tableau comparatif mois par mois
        months_header = [''] + [self.MONTH_NAMES[m][:3] for m in range(1, 13)]
        expenses_row = ['Dépenses'] + [f"{m['expenses']:.0f}" for m in monthly_evolution]
        income_row = ['Revenus'] + [f"{m['income']:.0f}" for m in monthly_evolution]

        comparison_data = [months_header, expenses_row, income_row]
        comparison_table = Table(comparison_data, colWidths=[2*cm] + [1.2*cm] * 12)
        comparison_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        elements.append(comparison_table)
        elements.append(Spacer(1, 20))

        # === RÉPARTITION ANNUELLE PAR CATÉGORIE ===
        if tag_spending:
            elements.append(Paragraph("RÉPARTITION PAR CATÉGORIE", self.styles['SectionHeader']))

            donut_bytes = self._generate_donut_chart(
                tag_spending,
                "",
                width=450,
                height=250
            )
            elements.append(Image(io.BytesIO(donut_bytes), width=15*cm, height=8.5*cm))
            elements.append(Spacer(1, 20))

        # === TOP 10 DÉPENSES ET MARCHANDS ===
        elements.append(PageBreak())
        elements.append(Paragraph("TOP 10 DÉPENSES DE L'ANNÉE", self.styles['SectionHeader']))

        if top_expenses:
            expense_data = [['#', 'Dépense', 'Montant']]
            for i, exp in enumerate(top_expenses, 1):
                expense_data.append([str(i), exp['label'][:30], f"{exp['value']:.2f} €"])

            expense_table = Table(expense_data, colWidths=[1*cm, 10*cm, 4*cm])
            expense_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ]))
            elements.append(expense_table)
            elements.append(Spacer(1, 20))

        elements.append(Paragraph("TOP 10 MARCHANDS DE L'ANNÉE", self.styles['SectionHeader']))

        if top_merchants:
            merchant_data = [['#', 'Marchand', 'Total']]
            for i, m in enumerate(top_merchants, 1):
                merchant_data.append([str(i), m['label'][:30], f"{m['value']:.2f} €"])

            merchant_table = Table(merchant_data, colWidths=[1*cm, 10*cm, 4*cm])
            merchant_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ]))
            elements.append(merchant_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================================================================
    # Export de graphiques individuels
    # =========================================================================

    def export_chart(self, chart_type: str, params: Dict[str, Any]) -> bytes:
        """
        Exporte un graphique individuel en PNG.

        Args:
            chart_type: Type de graphique (pie, bar, line, donut, area)
            params: Paramètres du graphique (month, year, etc.)

        Returns:
            Image PNG en bytes
        """
        month_str = params.get('month')  # Format YYYY-MM
        year = None
        month = None

        if month_str:
            parts = month_str.split('-')
            if len(parts) == 2:
                year, month = int(parts[0]), int(parts[1])

        if chart_type == 'pie' or chart_type == 'donut':
            if year and month:
                data = self._get_tag_spending(year, month)
                title = f"Répartition par catégorie - {self.MONTH_NAMES[month]} {year}"
            else:
                today = date.today()
                data = self._get_tag_spending(today.year, today.month)
                title = f"Répartition par catégorie - {self.MONTH_NAMES[today.month]} {today.year}"

            if chart_type == 'donut':
                return self._generate_donut_chart(data, title, 600, 400)
            else:
                return self._generate_pie_chart(data, title, 600, 400)

        elif chart_type == 'bar':
            data = self._get_monthly_evolution(6)
            return self._generate_grouped_bar_chart(data, "Évolution sur 6 mois", 700, 400)

        elif chart_type == 'line':
            if year:
                data = self._get_annual_evolution(year)
                title = f"Évolution mensuelle {year}"
            else:
                data = self._get_monthly_evolution(12)
                title = "Évolution sur 12 mois"
            return self._generate_line_chart(data, title, 700, 400)

        elif chart_type == 'area':
            # Pour area, on utilise le même que line avec fond rempli
            data = self._get_monthly_evolution(12)
            return self._generate_line_chart(data, "Évolution sur 12 mois", 700, 400)

        else:
            return self._generate_empty_chart(f"Type de graphique inconnu: {chart_type}", 600, 400)


def get_pdf_service(db: Session, user_id: int) -> PDFReportService:
    """Factory pour créer un service PDF."""
    return PDFReportService(db, user_id)
