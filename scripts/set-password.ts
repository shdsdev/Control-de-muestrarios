import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from web app
dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Needs service role for admin actions

if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function setPassword(email: string, pass: string) {
    console.log(`Setting password for ${email}...`)

    // Get user id by email
    const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers()
    const user = users.find(u => u.email === email)

    if (!user) {
        console.error(`User with email ${email} not found. Try signing in with Magic Link first so the user is created.`)
        return
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: pass,
        email_confirm: true
    })

    if (error) {
        console.error('Error setting password:', error.message)
    } else {
        console.log(`Success! Password set for ${email}. You can now log in with your password.`)
    }
}

const email = process.argv[2]
const pass = process.argv[3]

if (!email || !pass) {
    console.log('Usage: npx ts-node scripts/set-password.ts <email> <password>')
} else {
    setPassword(email, pass)
}
