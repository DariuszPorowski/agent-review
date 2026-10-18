from shipping import shipping_quote


def test_standard_shipping():
    assert shipping_quote(20) == 5


def test_free_shipping():
    assert shipping_quote(100) == 0


def test_expedited_shipping():
    assert shipping_quote(20, expedited=True) == 15
