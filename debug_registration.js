async function test() {
    const url = 'https://ybeippdhlvjzfgpbcoqy.supabase.co/functions/v1/register-client';
    const data = {
        email: "node_debug_fetch_3@example.com",
        password: "Password123!",
        first_name: "Node",
        last_name: "Debug",
        organization_id: "11111111-1111-1111-1111-111111111111",
        company_name: "Node Corp",
        rif: "J-00000000-0",
        phone: "0000",
        address: "Node St"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZWlwcGRobHZqemZncGJjb3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI4NDIsImV4cCI6MjA3NjE1ODg0Mn0.ZE5b6i4G5Pi-czKrw_16Ss-_soafxyWolLq3oW71lUg'
            },
            body: JSON.stringify(data)
        });

        console.log(`STATUS: ${response.status}`);
        const text = await response.text();
        console.log(`BODY: ${text}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
