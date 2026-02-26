import { google } from 'googleapis';
import { Readable } from 'stream';
import { supabase } from './supabase';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Google Drive credentials missing in environment variables');
    }

    // Robust key cleaning
    let cleanedKey = key;
    if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
        cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
    }

    // Convert literal "\\n" and normalize any extra physical enters
    cleanedKey = cleanedKey.replace(/\\n/g, '\n').replace(/\n+/g, '\n');

    const auth = new google.auth.JWT({
        email,
        key: cleanedKey,
        scopes: SCOPES
    });
    return google.drive({ version: 'v3', auth });
}

/**
 * Ensures a company has its root and subfolders in Drive.
 * Returns the "Propuestas" folder ID.
 */
export async function ensureCompanyFolders(empresaId: string) {
    const drive = await getDriveClient();

    // 1. Get company info
    const { data: empresa, error: fetchError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();

    if (fetchError || !empresa) throw new Error('Empresa not found');
    if (empresa.drive_folder_id) {
        // We should ideally verify if this ID still exists in Drive, 
        // but for now we assume consistency or let the next call fail.

        // We need to find the "Propuestas" subfolder ID. 
        // Usually we'd store specific subfolder IDs if we wanted to be super optimized,
        // but we can search for it by name under the root folder.
        const listResponse = await drive.files.list({
            q: `'${empresa.drive_folder_id}' in parents and name = 'Propuestas' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)'
        });

        if (listResponse.data.files && listResponse.data.files.length > 0) {
            return listResponse.data.files[0].id;
        }
    }

    // 2. Create Root Company Folder inside CLIENTES
    const rootResponse = await drive.files.create({
        requestBody: {
            name: empresa.nombre,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!]
        },
        fields: 'id, webViewLink'
    });

    const folderId = rootResponse.data.id!;

    // 3. Create Subfolders: Branding, Propuestas
    await drive.files.create({
        requestBody: {
            name: 'Branding',
            parents: [folderId],
            mimeType: 'application/vnd.google-apps.folder'
        }
    });

    const propuestasResponse = await drive.files.create({
        requestBody: {
            name: 'Propuestas',
            parents: [folderId],
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
    });

    // 4. Update DB
    const { error: updateError } = await supabase
        .from('empresas')
        .update({
            drive_folder_id: folderId,
            drive_folder_url: rootResponse.data.webViewLink
        })
        .eq('id', empresaId);

    if (updateError) console.error('Error updating empresa drive info:', updateError);

    return propuestasResponse.data.id;
}

/**
 * Creates the structured folder tree for a Design Request (Phase 6)
 * ROOT / PROPUESTAS / {Empresa} / {solicitudId}-{tipoProducto}-{YYYYMMDD}
 *   -> 00_INPUTS, 01_OUTPUT, 02_NOTAS
 */
export async function createDriveFolderForSolicitud({
    empresaId,
    empresaNombre,
    solicitudId,
    tipoProducto
}: {
    empresaId: string;
    empresaNombre: string;
    solicitudId: string;
    tipoProducto: string;
}) {
    const drive = await getDriveClient();
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

    // 1. Ensure "PROPUESTAS" exists in ROOT
    let propuestasRootId = await findOrCreateFolder(drive, 'PROPUESTAS', rootId);

    // 2. Ensure "{Empresa}" exists in "PROPUESTAS"
    let companyFolderId = await findOrCreateFolder(drive, empresaNombre, propuestasRootId);

    // 3. Create the Request Folder: {solicitudId}-{tipoProducto}-{YYYYMMDD}
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const requestFolderName = `${solicitudId}-${tipoProducto}-${dateStr}`.replace(/[/\\?%*:|"<>]/g, '-');

    const requestFolderResponse = await drive.files.create({
        requestBody: {
            name: requestFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [companyFolderId]
        },
        fields: 'id, webViewLink'
    });
    const requestFolderId = requestFolderResponse.data.id!;

    // 4. Create subfolders: 00_INPUTS, 01_OUTPUT, 02_NOTAS
    const subfolders = ['00_INPUTS', '01_OUTPUT', '02_NOTAS'];
    for (const name of subfolders) {
        await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [requestFolderId]
            }
        });
    }

    // 5. Update Solicitud in Supabase
    const { error: updateError } = await supabase
        .from('solicitudes')
        .update({
            drive_folder_id: requestFolderId,
            drive_folder_url: requestFolderResponse.data.webViewLink
        })
        .eq('id', solicitudId);

    if (updateError) console.error('Error updating solicitud drive info:', updateError);

    return {
        folderId: requestFolderId,
        webViewLink: requestFolderResponse.data.webViewLink
    };
}

/**
 * Helper to find a folder by name or create it if not found.
 */
async function findOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
    const listResponse = await drive.files.list({
        q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)'
    });

    if (listResponse.data.files && listResponse.data.files.length > 0) {
        return listResponse.data.files[0].id!;
    }

    const createResponse = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        },
        fields: 'id'
    });
    return createResponse.data.id!;
}

/**
 * Uploads a file to a specific Google Drive folder
 */
export async function uploadFileToDrive(folderId: string, fileName: string, fileBuffer: Buffer, mimeType: string) {
    const drive = await getDriveClient();

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId]
        },
        media: {
            mimeType: mimeType,
            body: Readable.from(fileBuffer)
        },
        fields: 'id, name, webViewLink, webContentLink'
    });

    return response.data;
}
