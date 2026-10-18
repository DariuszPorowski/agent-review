from shipping import shipping_quote


def test_standard_shipping():
    assert shipping_quote(20) == 5
