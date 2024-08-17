import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import db from "@repo/db/client";
import { JWT } from "next-auth/jwt";

interface Credentials {
    phone: string;
    password: string;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
                password: { label: "Password", type: "password", required: true }
            },
            async authorize(credentials: Credentials | any) {
                if (!credentials) {
                    return null;
                }

                const existingUser = await db.user.findFirst({
                    where: { number: credentials.phone }
                });

                if (existingUser) {
                    const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                    if (passwordValidation) {
                        return {
                            id: existingUser.id.toString(),
                            name: existingUser.name,
                            email: existingUser.number
                        };
                    } else {
                        return null;
                    }
                }

                try {
                    const hashedPassword = await bcrypt.hash(credentials.password, 10);
                    const newUser = await db.user.create({
                        data: {
                            number: credentials.phone,
                            password: hashedPassword
                        }
                    });

                    return {
                        id: newUser.id.toString(),
                        name: newUser.name,
                        email: newUser.number
                    };
                } catch (error) {
                    console.error("Error creating user:", error);
                    return null;
                }
            }
        })
    ],
    secret: process.env.JWT_SECRET,
    callbacks: {
        async session({ token, session }: { token: JWT, session: any }) {
            if (token?.sub) {
                session.user.id = token.sub;
            }
            return session;
        }
    }
};
