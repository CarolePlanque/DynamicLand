/*
Copyright (c) 2024 Carole Planque. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Carole Planque (carole.planque@unige.ch)
*/


// Cloud mask function
function cloud_mask(image) {
    // Develop mask to keep only the pixels with clear with low set conditions.
    // var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
    var qaMask = image.select('QA_PIXEL').eq(21824);
    // Apply mask.
    return image.updateMask(qaMask);
  }
  
  // Scaling function
  function applyScaleFactors(image) {
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
    var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
    return image.addBands(opticalBands, null, true)
                .addBands(thermalBands, null, true);
  }
  
  // NDVI function
  var ndvi_func = function(image){
    var nir = image.select('SR_B5');
    var red = image.select('SR_B4');
    var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
    return image.addBands(ndvi)
  };
  
  var aggreg_func = function(image) {
    var ndvi = image.select("NDVI")
    var LST = image.select("ST_B10")
    return ndvi.addBands(LST);
  };
  
  var sampling_image = function(sampling_site){
    var wrap = function(image) {
      var sampled_values = image.sample({ region: sampling_site, numPixels: 30, geometries: true})
      return sampled_values;
    }
    return wrap
  };
  
  
  // Function: soil moisture (Carlson, 2007)
  var Mo_func = function(ndvi_min,ndvi_max, lst_min, lst_max) {
    var image_ndvi_min = ee.Image.constant(ndvi_min);
    var image_ndvi_max = ee.Image.constant(ndvi_max);
    var image_lst_min = ee.Image.constant(lst_min);
    var image_lst_max = ee.Image.constant(lst_max);
    var wrap = function(image) {
      var Tn1 = image.select("ST_B10").subtract(image_lst_min);
      var Tn2 = image_lst_max.subtract(image_lst_min);
      var Tn = Tn1.divide(Tn2);
      
      var Fr1 = image.select("NDVI").subtract(image_ndvi_min);
      var Fr2 = image_ndvi_max.subtract(image_ndvi_min);
      var Fr = Fr1.divide(Fr2);
      
      var image1 = ee.Image.constant(1);
      var Mo1 = image1.subtract(Fr);
      var Mo2 = Tn.divide(Mo1);
      var Mo = image1.subtract(Mo2);
      return Mo.copyProperties(image, [
        // Picking properties from the original image.
        'system:time_start'
      ]);
    }
    return wrap
  }
  
  
  
  exports.soil_moisture = function(dataset, sampling_area, min_sm, max_sm) {
    
    /************************  
    * 0. CHECK PARAMETERS  
    ************************/
    if (min_sm === undefined) min_sm = 0;
    if (max_sm === undefined) max_sm = 1;
    print(max_sm)
    
    /************************  
    * 1. CREATE CLEAN IMAGE 
    ************************/
    // Apply cloud mask
    var dataset_cfree = dataset.map(cloud_mask)
  
    // Apply scaling factors
    var dataset_scaled = dataset_cfree.map(applyScaleFactors);
  
    /************************  
    * 2. CALCULATE NDVI (image)
    ************************/
    // Aplly NDVI function
    print("CALCULATE NDVI")
    var dataset_scaled_ndvi = dataset_scaled.map(ndvi_func)
    
    /************************  
    * 3. CREATE NDVI/ST COLLECTION 
    ************************/
    var collection_NDVI_LST = dataset_scaled_ndvi.map(aggreg_func);
    
    /************************  
    * 4. SAMPLING 
    ************************/
    // Apply sampling function to the ImageCollection
    var values = collection_NDVI_LST.map(sampling_image(sampling_area)).flatten()
    print(values)
    
    // Plot sampled features as a scatter chart
    var chart = ui.Chart.feature.byFeature(values, 'ST_B10', ['NDVI'])
      .setChartType('ScatterChart')
      .setOptions({ 
        pointSize: 2, 
        colors: ['DarkMagenta'],
        dataOpacity: 1,
        width: 600, height: 600, 
        titleX: 'LST', 
        titleY: 'NDVI',
        title: '',
        legend: {position: 'none'},
        hAxis: {  // x-axis
        viewWindow: {min: 280, max: 350}
        },
        vAxis: {  // y-axis
        viewWindow: {min: 0, max: 1}
        }
    })
    print(chart)
    
    /************************  
    * 5. CALCULATE NDVI & ST STATS 
    ************************/
    
    print("  *******************      ")
    print("NDVI and ST statistics")
    print("  *******************      ")
    print(" ")
  
    print("NDVIp99:")
    var NDVImax = values.aggregate_array("NDVI").reduce(ee.Reducer.percentile([99]))
    print(NDVImax)
    
    print("NDVIp01:")
    var NDVImin = values.aggregate_array("NDVI").reduce(ee.Reducer.percentile([1]))
    print(NDVImin)
    
    print("LSTp01:")
    var LSTmin = values.aggregate_array("ST_B10").reduce(ee.Reducer.percentile([1]))
    print(LSTmin)
    
    print("LSTp99:")
    var LSTmax = values.aggregate_array("ST_B10").reduce(ee.Reducer.percentile([99]))
    print(LSTmax)
    
    /************************  
    * 6. CALCULATE SOIL MOISTURE 
    ************************/
    // Apply Mo function
    var Mo_totram = collection_NDVI_LST.map(
                    Mo_func(NDVImin, NDVImax, LSTmin, LSTmax));
    
    
    // Calculate median SM for studied period
    var soil_moisture = Mo_totram.median()
    
    /************************  
    * 7. NORMALISING SM 
    ************************/
    // Set normalization parameters 
    print("NORMALISING SM")
    var VALmin = ee.Number(min_sm)
    var VALmax = ee.Number(max_sm)
    var a = ee.Number(1).divide(VALmax.subtract(VALmin))
    var b = ee.Number(1).subtract(a.multiply(VALmax))
    
    // normalising
    var sm_product_01 = soil_moisture.multiply(a)
    var sm_product_01 = sm_product_01.add(b)
    var sm_product_01 = sm_product_01.where(sm_product_01.select('constant').gt(1), 1)
    var sm_product_01 = sm_product_01.where(sm_product_01.select('constant').lt(0), 0)
    
    return sm_product_01
  }