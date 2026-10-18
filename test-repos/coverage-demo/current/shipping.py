def shipping_quote(amount: int, expedited: bool = False) -> int | None:
    if amount < 0:
        raise ValueError("amount must not be negative")
    if amount == 0:
        return None
    if expedited:
        return 15
    if amount >= 100:
        return 0
    return 5
