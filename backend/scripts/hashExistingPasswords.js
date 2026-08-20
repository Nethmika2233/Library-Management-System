// One-off migration: the app used to store passwords in plain text.
// This hashes any password that isn't already a bcrypt hash, in place.
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    let updated = 0;

    for (const user of users) {
        const looksHashed = /^\$2[aby]\$/.test(user.password);
        if (looksHashed) continue;

        const hash = await bcrypt.hash(user.password, 10);
        await prisma.user.update({ where: { userId: user.userId }, data: { password: hash } });
        console.log(`Hashed password for "${user.username}" (was: "${user.password}")`);
        updated++;
    }

    console.log(updated > 0 ? `Done — hashed ${updated} password(s).` : 'Nothing to do — all passwords already hashed.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
