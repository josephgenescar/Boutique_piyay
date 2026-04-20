// FLASH SALE VALIDATION & MANAGEMENT
// À ajouter dans dashboard.html et vendre.html

async function canAddFlashSale(sellerId, supabaseClient) {
    if (!supabaseClient) return false;
    
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        const { data: activeFlash, error } = await supabaseClient
            .from('user_products')
            .select('id')
            .eq('seller_id', sellerId)
            .eq('is_flash_sale', true)
            .gte('flash_start_at', twentyFourHoursAgo.toISOString())
            .limit(3);
        
        if (error) {
            console.error('Flash sale check error:', error);
            return false;
        }
        
        return (activeFlash || []).length < 3;
    } catch (err) {
        console.error('Error checking flash sales:', err);
        return false;
    }
}

async function startFlashSale(productId, oldPrice, supabaseClient, sellerId) {
    if (!supabaseClient) {
        alert('❌ Supabase pa inicialize');
        return false;
    }
    
    if (!oldPrice || parseFloat(oldPrice) <= 0) {
        alert('⚠️ Ansyen pri dwe pi gro pase 0');
        return false;
    }
    
    // Verifye limit
    const canAdd = await canAddFlashSale(sellerId, supabaseClient);
    if (!canAdd) {
        alert('❌ Ou gen deja 3 pwodwi nan vante flash. Tann yon kantite pou retire.');
        return false;
    }
    
    try {
        const now = new Date();
        const { error } = await supabaseClient
            .from('user_products')
            .update({
                is_flash_sale: true,
                old_price: parseFloat(oldPrice),
                flash_start_at: now.toISOString()
            })
            .eq('id', productId)
            .eq('seller_id', sellerId);
        
        if (error) throw error;
        
        console.log(`✅ Pwodwi ${productId} ajoute nan vante flash`);
        return true;
    } catch (err) {
        console.error('Error starting flash sale:', err);
        alert('❌ Erè: ' + err.message);
        return false;
    }
}

async function endFlashSale(productId, supabaseClient, sellerId) {
    if (!supabaseClient) {
        alert('❌ Supabase pa inicialize');
        return false;
    }
    
    try {
        const { error } = await supabaseClient
            .from('user_products')
            .update({
                is_flash_sale: false,
                flash_start_at: null
            })
            .eq('id', productId)
            .eq('seller_id', sellerId);
        
        if (error) throw error;
        
        console.log(`✅ Pwodwi ${productId} retire nan vante flash`);
        return true;
    } catch (err) {
        console.error('Error ending flash sale:', err);
        alert('❌ Erè: ' + err.message);
        return false;
    }
}

// Cleanup function (run locally or via Netlify function)
async function cleanupExpiredFlashSales(supabaseClient) {
    if (!supabaseClient) return;
    
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        const { error } = await supabaseClient
            .from('user_products')
            .update({
                is_flash_sale: false,
                flash_start_at: null
            })
            .eq('is_flash_sale', true)
            .lt('flash_start_at', twentyFourHoursAgo.toISOString());
        
        if (error) throw error;
        console.log('✅ Cleanup expired flash sales completed');
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}
