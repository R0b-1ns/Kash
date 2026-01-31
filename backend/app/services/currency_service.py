"""
Service de gestion des devises et conversions.

Fonctionnalités :
- Conversion entre devises
- Mise à jour des taux de change (manuel ou API externe)
- Calcul des montants en devise de référence (EUR)
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict
import logging

from sqlalchemy.orm import Session

from app.models.currency import Currency

logger = logging.getLogger(__name__)


class CurrencyService:
    """
    Service de conversion et gestion des devises.

    La devise de référence est l'EUR.
    Tous les taux (rate_to_eur) indiquent combien vaut 1 unité de la devise en EUR.
    Exemple : 1 USD = 0.92 EUR -> rate_to_eur = 0.92
    """

    def __init__(self, db: Session):
        """
        Initialise le service de devises.

        Args:
            db: Session de base de données
        """
        self.db = db
        self._cache: Dict[str, Decimal] = {}
        self._load_rates()

    def _load_rates(self) -> None:
        """Charge les taux de change en cache."""
        currencies = self.db.query(Currency).all()
        for curr in currencies:
            self._cache[curr.code] = curr.rate_to_eur

    def get_rate(self, currency_code: str) -> Optional[Decimal]:
        """
        Récupère le taux de change vers EUR.

        Args:
            currency_code: Code ISO de la devise (ex: USD)

        Returns:
            Le taux de change ou None si devise inconnue
        """
        code = currency_code.upper()

        if code in self._cache:
            return self._cache[code]

        # Chercher en BDD
        currency = self.db.query(Currency).filter(Currency.code == code).first()
        if currency:
            self._cache[code] = currency.rate_to_eur
            return currency.rate_to_eur

        return None

    def convert_to_eur(self, amount: Decimal, from_currency: str) -> Optional[Decimal]:
        """
        Convertit un montant vers EUR.

        Args:
            amount: Montant à convertir
            from_currency: Code de la devise source

        Returns:
            Montant en EUR ou None si devise inconnue

        Example:
            >>> convert_to_eur(Decimal("100"), "USD")
            Decimal("92.00")  # Si 1 USD = 0.92 EUR
        """
        if from_currency.upper() == "EUR":
            return amount

        rate = self.get_rate(from_currency)
        if rate is None:
            logger.warning(f"Devise inconnue : {from_currency}")
            return None

        result = amount * rate
        return result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def convert_from_eur(self, amount: Decimal, to_currency: str) -> Optional[Decimal]:
        """
        Convertit un montant depuis EUR.

        Args:
            amount: Montant en EUR
            to_currency: Code de la devise cible

        Returns:
            Montant converti ou None si devise inconnue

        Example:
            >>> convert_from_eur(Decimal("92"), "USD")
            Decimal("100.00")  # Si 1 USD = 0.92 EUR
        """
        if to_currency.upper() == "EUR":
            return amount

        rate = self.get_rate(to_currency)
        if rate is None or rate == 0:
            logger.warning(f"Devise inconnue ou taux nul : {to_currency}")
            return None

        result = amount / rate
        return result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def convert(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str
    ) -> Optional[Decimal]:
        """
        Convertit un montant d'une devise à une autre.

        Passe par EUR comme intermédiaire.

        Args:
            amount: Montant à convertir
            from_currency: Devise source
            to_currency: Devise cible

        Returns:
            Montant converti ou None si une devise est inconnue

        Example:
            >>> convert(Decimal("100"), "USD", "GBP")
            Decimal("78.63")
        """
        from_code = from_currency.upper()
        to_code = to_currency.upper()

        if from_code == to_code:
            return amount

        # Convertir vers EUR d'abord
        eur_amount = self.convert_to_eur(amount, from_code)
        if eur_amount is None:
            return None

        # Puis vers la devise cible
        return self.convert_from_eur(eur_amount, to_code)

    def update_rate(self, currency_code: str, new_rate: Decimal) -> bool:
        """
        Met à jour le taux de change d'une devise.

        Args:
            currency_code: Code de la devise
            new_rate: Nouveau taux vers EUR

        Returns:
            True si mis à jour, False si devise inconnue
        """
        code = currency_code.upper()

        currency = self.db.query(Currency).filter(Currency.code == code).first()
        if not currency:
            return False

        currency.rate_to_eur = new_rate
        self.db.commit()

        # Mettre à jour le cache
        self._cache[code] = new_rate

        logger.info(f"Taux de change mis à jour : {code} = {new_rate} EUR")
        return True

    def get_all_currencies(self) -> list:
        """
        Récupère toutes les devises disponibles.

        Returns:
            Liste des devises avec leurs infos
        """
        currencies = self.db.query(Currency).order_by(Currency.code).all()
        return [
            {
                "code": c.code,
                "name": c.name,
                "symbol": c.symbol,
                "rate_to_eur": float(c.rate_to_eur)
            }
            for c in currencies
        ]

    def format_amount(
        self,
        amount: Decimal,
        currency_code: str,
        include_symbol: bool = True
    ) -> str:
        """
        Formate un montant avec le symbole de devise.

        Args:
            amount: Montant à formater
            currency_code: Code de la devise
            include_symbol: Inclure le symbole ou non

        Returns:
            Montant formaté (ex: "123.45 €")
        """
        currency = self.db.query(Currency).filter(
            Currency.code == currency_code.upper()
        ).first()

        formatted = f"{float(amount):,.2f}".replace(",", " ")

        if include_symbol and currency:
            return f"{formatted} {currency.symbol}"
        else:
            return f"{formatted} {currency_code.upper()}"


def get_currency_service(db: Session) -> CurrencyService:
    """Factory pour créer le service de devises."""
    return CurrencyService(db)
