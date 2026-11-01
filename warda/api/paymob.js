// api/paymob.js

export default async function handler(req, res) {
  // استقبال الطلبات من المتجر فقط عبر POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, billingData, items } = req.body;

    // المفاتيح الخاصة بك من Paymob
    const apiKey = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T1RrMk9UQXpMQ0p1WVcxbElqb2lhVzVwZEdsaGJDSjkuUXpHRkdTNWFKTDlqWFBLQ1pOdGVTS3pfTjhoY1lHSU1NckZfT1dVVVRySXBNenBUZmxzMi0zZ3lqS1YwTVA2S2JsQ1FyN0hLalJfTWU3R19UMmV3bmc=";
    const integrationId = 4840923; //[cite: 3]

    // 1. طلب التوكن (Authentication Token)
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    });
    const authData = await authRes.json();
    const token = authData.token;

    if (!token) {
      return res.status(400).json({ error: 'Failed to authenticate with Paymob', details: authData });
    }

    // 2. تسجيل الطلب (Order Registration)
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "true",
        amount_cents: Math.round(amount * 100), // تحويل المبلغ للقروش
        currency: "EGP",
        items: items || []
      })
    });
    const orderData = await orderRes.json();

    // 3. استخراج مفتاح الدفع (Payment Key)
    const payKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "NA",
          email: billingData.email,
          floor: "NA",
          first_name: billingData.name.split(' ')[0] || billingData.name,
          street: billingData.address,
          building: "NA",
          phone_number: billingData.phone,
          shipping_method: "PKG",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          last_name: billingData.name.split(' ')[1] || "Warda"
        },
        currency: "EGP",
        integration_id: integrationId
      })
    });
    const payKeyData = await payKeyRes.json();

    if (!payKeyData.token) {
      return res.status(400).json({ error: 'Failed to generate payment key', details: payKeyData });
    }

    // إرجاع توكن الدفع النهائي للمتجر
    return res.status(200).json({ paymentToken: payKeyData.token });

  } catch (error) {
    console.error('Paymob Serverless Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}