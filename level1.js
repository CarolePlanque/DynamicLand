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

exports.veg = function(dataset, min_ndvi, max_ndvi) {
  
  /************************  
  * 0. CHECK PARAMETERS  
  ************************/
  if (min_ndvi === undefined) min_ndvi = 0;
  if (max_ndvi === undefined) max_ndvi = 1;
  
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
  * 3. CALCULATE MAX NDVI 
  ************************/
  // annual NDVI max
  print("CALCULATE MAX NDVI")
  var ndvi_product = dataset_scaled_ndvi.select('NDVI')
  var veg_product = ndvi_product.max()
  
  /************************  
  * 4. NORMALISING NDVI 
  ************************/
  // Set normalization parameters 
  print("NORMALISING NDVI")
  var VALmin = ee.Number(min_ndvi)
  var VALmax = ee.Number(max_ndvi)
  var a = ee.Number(1).divide(VALmax.subtract(VALmin))
  var b = ee.Number(1).subtract(a.multiply(VALmax))
  
  // normalising
  var veg_product_01 = veg_product.multiply(a)
  var veg_product_01 = veg_product_01.add(b)
  var veg_product_01 = veg_product_01.where(veg_product_01.select('NDVI').gt(1), 1)
  var veg_product_01 = veg_product_01.where(veg_product_01.select('NDVI').lt(0), 0)
  
  return veg_product_01
};