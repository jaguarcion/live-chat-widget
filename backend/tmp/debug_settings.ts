import { prisma } from '../src/db';

async function main() {
    const settings = await prisma.projectSettings.findMany();
    console.log(JSON.stringify(settings, null, 2));
}

main().catch(console.error);
