import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
    console.error('ERROR: DATABASE_URL is not a PostgreSQL connection URL.');
    console.error('Current DATABASE_URL type:', databaseUrl ? databaseUrl.split(':')[0] : 'missing');
    process.exit(1);
}

const client = new Client({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false,
    },
});

try {
    await client.connect();

    console.log('Connected to production PostgreSQL.');

    const check = await client.query(`
    SELECT id, "storeName", "businessName"
    FROM "StoreSetting";
  `);

    console.log('\nCurrent StoreSetting:');
    console.table(check.rows);

    const result = await client.query(`
    UPDATE "StoreSetting"
    SET
      "storeName" = 'RK Peedika',
      "businessName" = 'RK Peedika'
    RETURNING id, "storeName", "businessName";
  `);

    console.log('\nUpdated StoreSetting:');
    console.table(result.rows);

    console.log('\nSUCCESS: Store name changed to RK Peedika.');
} catch (error) {
    console.error('\nDatabase update failed:');
    console.error(error);
    process.exit(1);
} finally {
    await client.end().catch(() => { });
}