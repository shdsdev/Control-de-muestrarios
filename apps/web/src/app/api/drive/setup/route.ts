import { NextRequest, NextResponse } from 'next/server';
import { ensureCompanyFolders, createDriveFolderForSolicitud, uploadFileToDrive } from '@/lib/drive-automation';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const solicitudId = formData.get('solicitudId') as string;
        const empresaId = formData.get('empresaId') as string;
        const empresaNombre = formData.get('empresaNombre') as string;
        const codigo = formData.get('codigo') as string;
        const clienteNombre = formData.get('clienteNombre') as string;
        const tipoProducto = formData.get('tipoProducto') as string;
        const logoFile = formData.get('logoFile') as File | null;

        if (!solicitudId || !empresaId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        console.log(`[DRIVE-SETUP] Starting setup for request ${codigo} (${solicitudId})`);

        // 1. Create the structured request folder tree (ROOT/PROPUESTAS/{Empresa}/{RequestId}-...)
        console.log(`[DRIVE-SETUP] Creating structured request folder for ${codigo}`);
        const requestFolder = await createDriveFolderForSolicitud({
            empresaId,
            empresaNombre: empresaNombre || 'EMPRESA_DESCONOCIDA',
            solicitudId,
            tipoProducto: tipoProducto || 'GENERAL'
        });

        let logoMetadata = null;

        // 2. Upload logo if provided to the new folder
        if (logoFile && requestFolder.folderId) {
            console.log(`[DRIVE-SETUP] Uploading logo: ${logoFile.name}`);
            const buffer = Buffer.from(await logoFile.arrayBuffer());
            logoMetadata = await uploadFileToDrive(
                requestFolder.folderId,
                `LOGO_${codigo}_${logoFile.name}`,
                buffer,
                logoFile.type
            );

            // 3. Update Supabase with the file URL if we uploaded it
            if (logoMetadata?.webViewLink) {
                await supabase
                    .from('solicitudes')
                    .update({
                        logo_url: logoMetadata.webViewLink
                    })
                    .eq('id', solicitudId);

                // Also create an entry in solicitud_assets
                await supabase
                    .from('solicitud_assets')
                    .insert({
                        solicitud_id: solicitudId,
                        tipo: 'logo',
                        file_url: logoMetadata.webViewLink,
                        file_name: logoFile.name
                    });
            }
        }

        return NextResponse.json({
            success: true,
            folderId: requestFolder.folderId,
            folderUrl: requestFolder.webViewLink,
            logoUrl: logoMetadata?.webViewLink
        });

    } catch (error: any) {
        console.error('[DRIVE-SETUP] Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error
        }, { status: 500 });
    }
}
