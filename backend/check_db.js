
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- Environment Check ---');
    console.log('PORT in process.env:', process.env.PORT);

    console.log('--- Database Check ---');
    try {
        const users = await prisma.user.findMany();
        console.log('User count:', users.length);
        if (users.length > 0) {
            console.log('Sample User ID:', users[0].id);
        } else {
            console.log('WARNING: No users found in database!');
        }
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
