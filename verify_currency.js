import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log("Starting verification...");

    // 1. Register a new user
    const uniqueId = Date.now();
    const user = {
        username: `testuser_${uniqueId}`,
        email: `test_${uniqueId}@gmail.com`,
        password: 'password123'
    };

    console.log(`Registering user: ${user.email}`);
    let res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });

    if (!res.ok) {
        console.error("Registration failed:", await res.text());
        return;
    }

    // 2. Login
    console.log("Logging in...");
    res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password })
    });

    if (!res.ok) {
        console.error("Login failed:", await res.text());
        return;
    }

    const loginData = await res.json();
    const token = loginData.token;
    console.log("Login successful, token received.");

    // 3. Register Loan USD
    console.log("Registering USD Loan...");
    const loanUSD = {
        nombres: "John",
        apellidos: "Doe",
        telefono: "999888777",
        motivo: "Test USD",
        monto: 1000,
        fecha: "2026-05-20",
        cuotas: 5,
        fecha_limite: "2026-10-20",
        moneda: "USD"
    };

    res = await fetch(`${BASE_URL}/prestamos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(loanUSD)
    });

    if (!res.ok) {
        console.error("Loan USD creation failed:", await res.text());
    } else {
        const data = await res.json();
        console.log("Loan USD created:", data);
        if (data.prestamo.moneda === "USD" && data.prestamo.nombre === "John Doe") {
            console.log("SUCCESS: USD Loan verified (Currency: USD, Name: John Doe)");
        } else {
            console.error("FAILURE: USD Loan data mismatch", data.prestamo);
        }
    }

    // 4. Register Loan PEN (default)
    console.log("Registering PEN Loan...");
    const loanPEN = {
        nombres: "Jane",
        apellidos: "Smith",
        telefono: "999888777",
        motivo: "Test PEN",
        monto: 500,
        fecha: "2026-05-20",
        cuotas: 2,
        fecha_limite: "2026-07-20",
        // No moneda field, should default to PEN
    };

    res = await fetch(`${BASE_URL}/prestamos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(loanPEN)
    });

    if (!res.ok) {
        console.error("Loan PEN creation failed:", await res.text());
    } else {
        const data = await res.json();
        console.log("Loan PEN created:", data);
        if (data.prestamo.moneda === "PEN" && data.prestamo.nombre === "Jane Smith") {
            console.log("SUCCESS: PEN Loan verified (Currency: PEN, Name: Jane Smith)");
        } else {
            console.error("FAILURE: PEN Loan data mismatch", data.prestamo);
        }
    }
}

runTest();
