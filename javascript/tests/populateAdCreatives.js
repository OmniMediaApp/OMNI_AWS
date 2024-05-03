require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const axios = require('axios');
const populateAdMediaMain = require('./populateAdMedia');

// const dbOptions = {
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     database: process.env.DB_DATABASE,
//     password: process.env.DB_PASSWORD,
//     port: process.env.DB_PORT,
// };

// const client = new Client(dbOptions);

// async function connectToDatabase() {
//     try {
//         await client.connect();
//         console.log('Connected to the database');
//     } catch (err) {
//         console.error('Database connection error', err.stack);
//         process.exit(1);
//     }
// }

async function getAdCreatives(fb_adAccountID, accessToken) {
    try {
        const apiUrl = `https://graph.facebook.com/v19.0/${fb_adAccountID}`;
        const fields = 'ads{campaign_id,adcreatives.limit(500){id,authorization_category,body,branded_content,call_to_action_type,account_id,categorization_criteria,category_media_source,degrees_of_freedom_spec,effective_instagram_media_id,effective_instagram_story_id,effective_object_story_id,facebook_branded_content,image_crops,image_hash,image_url,instagram_branded_content,instagram_permalink_url,instagram_story_id,instagram_user_id,instagram_actor_id,link_url,name,object_id,object_store_url,object_type,recommender_settings,status,template_url,thumbnail_id,thumbnail_url,title,url_tags,video_id}}';

        
        const response = await axios.get(apiUrl, {
            params: {
                fields: fields,
                access_token: accessToken
            }
        });
  
        return response.data;

    } catch (error) {
        console.error('Error fetching data:', error.response.data);
        return null;
    }
}

async function populateAdCreatives(facebookCreativesData, postgres) {
    const query = `
        INSERT INTO fb_ad_creative (
            ad_creative_id, ad_id, campaign_id, account_id, name, degrees_of_freedom_spec, effective_instagram_media_id, effective_object_story_id,
            instagram_permalink_url, instagram_user_id, instagram_actor_id, object_type, status, thumbnail_id, thumbnail_url, title, url_tags,
            authorization_category, body, call_to_action_type, omni_business_id) 
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (ad_creative_id) DO UPDATE SET
            ad_id = EXCLUDED.ad_id,
            campaign_id = EXCLUDED.campaign_id,
            account_id = EXCLUDED.account_id,
            name = EXCLUDED.name,
            degrees_of_freedom_spec = EXCLUDED.degrees_of_freedom_spec,
            effective_instagram_media_id = EXCLUDED.effective_instagram_media_id,
            effective_object_story_id = EXCLUDED.effective_object_story_id,
            instagram_permalink_url = EXCLUDED.instagram_permalink_url,
            instagram_user_id = EXCLUDED.instagram_user_id,
            instagram_actor_id = EXCLUDED.instagram_actor_id,
            object_type = EXCLUDED.object_type,
            status = EXCLUDED.status,
            thumbnail_id = EXCLUDED.thumbnail_id,
            thumbnail_url = EXCLUDED.thumbnail_url,
            title = EXCLUDED.title,
            url_tags = EXCLUDED.url_tags,
            authorization_category = EXCLUDED.authorization_category,
            body = EXCLUDED.body,
            call_to_action_type = EXCLUDED.call_to_action_type,
            omni_business_id = EXCLUDED.omni_business_id;
    `;
    const values = [
        facebookCreativesData.ad_creative_id, facebookCreativesData.ad_id, facebookCreativesData.campaign_id, facebookCreativesData.account_id,
        facebookCreativesData.name, facebookCreativesData.degrees_of_freedom_spec, facebookCreativesData.effective_instagram_media_id, facebookCreativesData.effective_object_story_id,
        facebookCreativesData.instagram_permalink_url, facebookCreativesData.instagram_user_id, facebookCreativesData.instagram_actor_id, facebookCreativesData.object_type,
        facebookCreativesData.status, facebookCreativesData.thumbnail_id, facebookCreativesData.thumbnail_url, facebookCreativesData.title,
        facebookCreativesData.url_tags, facebookCreativesData.authorization_category, facebookCreativesData.body, facebookCreativesData.call_to_action_type,
        facebookCreativesData.omni_business_id,
    ];
    try {
        await postgres.query(query, values);
        console.log(`Ad Creative ${facebookCreativesData.ad_creative_id} has been successfully inserted or updated.`);
    } catch (error) {
        console.error('Error inserting or updating ad creative:', error);
        
    }
}

async function populateAdCreativesMain(postgres, omniBusinessId, fb_adAccountID, accessToken) {

    const facebookCreativesData = await getAdCreatives(fb_adAccountID, accessToken);



    for (let i = 0; i < facebookCreativesData.ads.data.length; i++) {
        for (let j = 0; j < facebookCreativesData.ads.data[i].adcreatives.data.length; j++) {
            if (!facebookCreativesData || !facebookCreativesData.ads.data[i] || !facebookCreativesData.ads.data[i].adcreatives.data[j]) {
                console.error('Invalid or missing creative data');
                return;  // Exit if no data to process
            }
            
            const creativeData = {
                ad_id: facebookCreativesData.ads.data[i].id,
                campaign_id: facebookCreativesData.ads.data[i].campaign_id, 
                ad_creative_id: facebookCreativesData.ads.data[i].adcreatives.data[j].id,
                account_id: facebookCreativesData.ads.data[i].adcreatives.data[j].account_id,
                name: facebookCreativesData.ads.data[i].adcreatives.data[j].name,
                degrees_of_freedom_spec: facebookCreativesData.ads.data[i].adcreatives.data[j].degrees_of_freedom_spec,
                effective_instagram_media_id: facebookCreativesData.ads.data[i].adcreatives.data[j].effective_instagram_media_id,
                effective_object_story_id: facebookCreativesData.ads.data[i].adcreatives.data[j].effective_object_story_id,
                instagram_permalink_url: facebookCreativesData.ads.data[i].adcreatives.data[j].instagram_permalink_url,
                instagram_user_id: facebookCreativesData.ads.data[i].adcreatives.data[j].instagram_user_id,
                instagram_actor_id: facebookCreativesData.ads.data[i].adcreatives.data[j].instagram_actor_id,
                object_type: facebookCreativesData.ads.data[i].adcreatives.data[j].object_type,
                status: facebookCreativesData.ads.data[i].adcreatives.data[j].status,
                thumbnail_id: facebookCreativesData.ads.data[i].adcreatives.data[j].thumbnail_id,
                thumbnail_url: facebookCreativesData.ads.data[i].adcreatives.data[j].thumbnail_url,
                title: facebookCreativesData.ads.data[i].adcreatives.data[j].title,
                url_tags: facebookCreativesData.ads.data[i].adcreatives.data[j].url_tags,
                authorization_category: facebookCreativesData.ads.data[i].adcreatives.data[j].authorization_category,
                body: facebookCreativesData.ads.data[i].adcreatives.data[j].body,
                call_to_action_type: facebookCreativesData.ads.data[i].adcreatives.data[j].call_to_action_type,
                omni_business_id: omniBusinessId
            };
                
            try {
                //console.log(creativeData)
                await populateAdCreatives(creativeData,postgres);

                const video_id = facebookCreativesData.ads.data[i].adcreatives.data[j].video_id;
                const creative_id = facebookCreativesData.ads.data[i].adcreatives.data[j].id;
                if (video_id){
                await populateAdMediaMain(video_id, creative_id, postgres);
                }
            } catch (error) {
                console.error(`Error inserting or updating creative ${creative.id}:`, error);
            }
        }

    }




}

module.exports = populateAdCreativesMain;