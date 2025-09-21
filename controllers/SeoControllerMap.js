const axios = require('axios');
const seoApiKeyService = require('../services/seoApiKeyService');

// Grid size mappings for heatmap functionality
const GRID_SIZES = {
  '0.7x0.7': { radius: 0.35, cell: 0.35 },
  '1.75x1.75': { radius: 0.875, cell: 0.875 },
  '3.5x3.5': { radius: 1.75, cell: 1.75 },
  '5.25x5.25': { radius: 2.625, cell: 2.625 },
  '7x7': { radius: 3.5, cell: 3.5 },
  '14x14': { radius: 7, cell: 7 },
  '21x21': { radius: 10.5, cell: 10.5 }
};

/**
 * Geocode an address using OpenCage Data API
 */
async function geocodeWithOpenCage(address, apiKey) {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;
    const response = await axios.get(url);
    const data = response.data;
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No results from OpenCage API');
    }
    
    const result = data.results[0];
    return {
      lat: parseFloat(result.geometry.lat),
      lng: parseFloat(result.geometry.lng),
      formatted: result.formatted
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`OpenCage API error: ${error.response.status} - ${error.response.data?.status?.message || error.message}`);
    }
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

/**
 * Search using SerpApi for local business results
 */
async function searchWithSerpApi(query, coordinates, apiKey) {
  try {
    const ll = `@${coordinates.lat.toFixed(7)},${coordinates.lng.toFixed(7)},14z`;
    const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&ll=${encodeURIComponent(ll)}&google_domain=google.com&hl=en&type=search&api_key=${encodeURIComponent(apiKey)}`;
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`SerpApi error: ${error.response.status} - ${error.response.data?.error || error.message}`);
    }
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Generate grid points around a center coordinate
 */
function generateGrid(center, radiusMiles, cellMiles) {
  const EARTH_RADIUS_MI = 3958.761;
  const toRad = (d) => (d * Math.PI) / 180;
  const milesToLatDelta = (mi) => mi / 69;
  const milesToLngDelta = (mi, latDeg) => mi / (69 * Math.max(0.000001, Math.cos(toRad(latDeg))));
  
  const stepLat = milesToLatDelta(cellMiles);
  const stepLng = milesToLngDelta(cellMiles, center.lat);
  
  const latDelta = milesToLatDelta(radiusMiles);
  const lngDelta = milesToLngDelta(radiusMiles, center.lat);
  
  const latMin = center.lat - latDelta;
  const latMax = center.lat + latDelta;
  const lngMin = center.lng - lngDelta;
  const lngMax = center.lng + lngDelta;
  
  const points = [];
  let idCounter = 1;
  let row = 0;
  
  for (let lat = latMin; lat <= latMax + 1e-12; lat += stepLat, row++) {
    let col = 0;
    for (let lng = lngMin; lng <= lngMax + 1e-12; lng += stepLng, col++) {
      points.push({
        id: String(idCounter++),
        lat,
        lng,
        row,
        col
      });
    }
  }
  
  return points;
}

// Placeholder functions for existing SEO endpoints
exports.getUrlMetrics = async (req, res) => {
  res.json({ success: true, message: 'URL Metrics endpoint - implement as needed' });
};

exports.getKeywordMetrics = async (req, res) => {
  res.json({ success: true, message: 'Keyword Metrics endpoint - implement as needed' });
};

exports.getKeywordIdeas = async (req, res) => {
  res.json({ success: true, message: 'Keyword Ideas endpoint - implement as needed' });
};

exports.getKeywordSuggestions = async (req, res) => {
  res.json({ success: true, message: 'Keyword Suggestions endpoint - implement as needed' });
};

exports.saveKeywordFromSuggestions = async (req, res) => {
  res.json({ success: true, message: 'Save Keyword endpoint - implement as needed' });
};

exports.checkGoogleRank = async (req, res) => {
  res.json({ success: true, message: 'Google Rank Check endpoint - implement as needed' });
};

exports.getWebsiteTraffic = async (req, res) => {
  res.json({ success: true, message: 'Website Traffic endpoint - implement as needed' });
};

exports.getWebsiteAuthority = async (req, res) => {
  res.json({ success: true, message: 'Website Authority endpoint - implement as needed' });
};

exports.getWebsiteBacklinks = async (req, res) => {
  res.json({ success: true, message: 'Website Backlinks endpoint - implement as needed' });
};

exports.getDomainBacklinks = async (req, res) => {
  res.json({ success: true, message: 'Domain Backlinks endpoint - implement as needed' });
};

exports.getDomainKeywords = async (req, res) => {
  res.json({ success: true, message: 'Domain Keywords endpoint - implement as needed' });
};

exports.searchGoogle = async (req, res) => {
  res.json({ success: true, message: 'Google Search endpoint - implement as needed' });
};

exports.healthCheck = async (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'SEO API is healthy',
    timestamp: new Date().toISOString()
  });
};

// ===== NEW HEATMAP FUNCTIONS =====

/**
 * SEO Rankings Analysis - Single Endpoint
 * POST /api/analyze
 */
exports.runSEOAnalysis = async (req, res) => {
  try {
    const { 
      business_address, 
      keyword, 
      target_business_name, 
      grid_size
    } = req.body;
    
    // Validate required fields
    if (!business_address || !keyword || !target_business_name || !grid_size) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: business_address, keyword, target_business_name, grid_size'
      });
    }
    
    // Get OpenCage API key from environment
    const config = require('../config/config');
    const opencageApiKey = config.seo.opencageApiKey;
    
    if (!opencageApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenCage API key not configured'
      });
    }
    
    // Get available SerpApi key from database
    let serpapiKey = await seoApiKeyService.getAvailableApiKey();
    
    if (!serpapiKey) {
      return res.status(500).json({
        success: false,
        error: 'No available SerpApi keys. All keys have reached their monthly limit (249 calls).'
      });
    }
    
    // Check if current API key has reached 240 calls and switch if needed
    serpapiKey = await seoApiKeyService.getNextApiKeyIfNeeded(serpapiKey);
    
    if (!serpapiKey) {
      return res.status(500).json({
        success: false,
        error: 'No available SerpApi keys. All keys have reached their monthly limit (249 calls).'
      });
    }
    
    // Step 1: Geocode business address
    console.log('Step 1: Geocoding business address...');
    const coordinates = await geocodeWithOpenCage(business_address, opencageApiKey);
    
    // Step 2: Generate grid
    console.log('Step 2: Generating grid points...');
    const gridConfig = GRID_SIZES[grid_size];
    if (!gridConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid grid size. Available sizes: ' + Object.keys(GRID_SIZES).join(', ')
      });
    }
    
    const points = generateGrid(coordinates, gridConfig.radius, gridConfig.cell);
    
    // Step 3: Run SerpApi searches with 1 second delay
    console.log(`Step 3: Running ${points.length} SerpApi searches...`);
    const rankingPoints = [];
    let successfulApiCalls = 0;
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      try {
        console.log(`Searching point ${i + 1}/${points.length} (${point.id})...`);
        const searchResults = await searchWithSerpApi(keyword, point, serpapiKey);
        
        // Track successful API calls
        successfulApiCalls++;
        
        let rank = null;
        
        if (searchResults.local_results && Array.isArray(searchResults.local_results)) {
          // Find the target business in results
          const targetIndex = searchResults.local_results.findIndex(result => 
            result.title && result.title.toLowerCase().includes(target_business_name.toLowerCase())
          );
          
          if (targetIndex !== -1) {
            rank = targetIndex + 1; // Position 1 = rank 1
            console.log(`Found "${target_business_name}" at array index ${targetIndex}, rank ${rank}`);
          } else {
            console.log(`"${target_business_name}" not found in search results for point ${point.id}`);
          }
        }
        
        // Format coordinates for SerpApi ll parameter
        const ll = `@${point.lat.toFixed(7)},${point.lng.toFixed(7)},14z`;
        
        rankingPoints.push({
          id: point.id,
          lat: parseFloat(point.lat.toFixed(7)),
          lng: parseFloat(point.lng.toFixed(7)),
          ll: ll,
          rank: rank
        });
        
        // Rate limiting - 1 second between calls
        if (i < points.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Error searching point ${point.id}:`, error.message);
        
        // Still include the point with null rank for errors
        const ll = `@${point.lat.toFixed(7)},${point.lng.toFixed(7)},14z`;
        rankingPoints.push({
          id: point.id,
          lat: parseFloat(point.lat.toFixed(7)),
          lng: parseFloat(point.lng.toFixed(7)),
          ll: ll,
          rank: null
        });
      }
    }
    
    // Increment API key usage by the total number of successful calls made
    if (successfulApiCalls > 0) {
      await seoApiKeyService.incrementApiKeyUsage(serpapiKey, successfulApiCalls);
      console.log(`📊 Total API calls made: ${successfulApiCalls}`);
    }
    
    console.log(`SEO Analysis completed. Found rankings in ${rankingPoints.filter(p => p.rank !== null).length} of ${rankingPoints.length} searches.`);
    
    // Return simplified response format
    res.json({
      query: keyword,
      center: {
        lat: parseFloat(coordinates.lat.toFixed(7)),
        lng: parseFloat(coordinates.lng.toFixed(7))
      },
      points: rankingPoints
    });
    
  } catch (error) {
    console.error('SEO Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available grid sizes
 * GET /api/grid-sizes
 */
exports.getGridSizes = (req, res) => {
  res.json({
    success: true,
    grid_sizes: Object.keys(GRID_SIZES).map(size => ({
      size,
      radius_miles: GRID_SIZES[size].radius,
      cell_size_miles: GRID_SIZES[size].cell,
      description: `${size} mile grid with ${GRID_SIZES[size].radius} mile radius`
    }))
  });
};

/**
 * Add a new SerpApi key to rotation
 * POST /api/add-key
 */
exports.addApiKey = async (req, res) => {
  try {
    const { api_key } = req.body;
    
    if (!api_key) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    const added = await seoApiKeyService.addApiKey(api_key);
    
    if (added) {
      res.json({
        success: true,
        message: 'API key added to rotation successfully'
      });
    } else {
      res.json({
        success: false,
        error: 'API key already exists in rotation'
      });
    }
    
  } catch (error) {
    console.error('Error adding API key:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get API key usage statistics
 * GET /api/usage-stats
 */
exports.getUsageStats = async (req, res) => {
  try {
    const stats = await seoApiKeyService.getUsageStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};