
/*
Copyright (c) 2024 Carole Planque. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Carole Planque (carole.planque@unige.ch)
*/


/************************  
* 0. DRAW AREAS 
************************/
// a) Draw training area and name it (e.g., here Sudd)
// b) Draw processing area and call it 'geometry'
var DEM = ee.Image("USGS/SRTMGL1_003");

Map.addLayer(DEM, {
  min: 0,
  max: 3000,
  palette: [
    'ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
    '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
    '012e01', '011d01', '011301'
  ]}, 'DEM');


/************************  
* 0.bis SET PARAMETERS  
************************/

// SET SITE NAME
var site_name = 'Sudd'

// SET SITE TRAINING AREA
var training_area = Sudd
Map.addLayer(training_area,{},'training area')
print(training_area)

// SET SITE EXTENT
var AOI = geometry

// SET EPSG FOR EXPORT
var epsg = 'EPSG:27700' // uk


// CONTINENT
var w_region = 'global'

// SET DATE
var start_date = "2022-01-01"
var end_date = "2024-12-31"


/************************  
* 0.ter LOAD LIBRARIES  
************************/

var level1_func = require('users/caroleplanque/dynamicland:level1');
var level2_func = require('users/caroleplanque/dynamicland:level2');

/************************  
* 1. LOAD DATASETS  
************************/

// 1.1. LOAD Landsat-8 data
var dataset_LC08_C02 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start_date, end_date)
    .filterMetadata('CLOUD_COVER', 'less_than',30)
    .filterBounds(AOI);
print(dataset_LC08_C02)

// 1.2. LOAD Global Surface Water data
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');


/************************  
* 2. RUN LEVEL 1  
************************/
// Apply veg function
var veg_product_01 = level1_func.veg(dataset_LC08_C02, 0, 1);
Map.addLayer(veg_product_01,{},'veg')

/************************  
* 3. RUN LEVEL 2  
************************/
// Apply veg function
var soil_moisture_01 = level2_func.soil_moisture(dataset_LC08_C02, w_region, 
                                                  training_area);

Map.addLayer(soil_moisture_01,{},'SM')

/************************  
* 4. RUN LEVEL 3  
************************/
// Focus was on semi-natural vegetation. Consequently cultivated/managed vegetation layer was set to 0.


//                 *******************                 //     
//                   Mask water bodies                 //
//                 *******************                 // 

var visualization = {
  bands: ['occurrence'],
  min: 0.0,
  max: 100.0,
  palette: ['0000ff']
};

Map.addLayer(water, visualization, 'Water');
print(water)

/************************  
* 5. EXPORT TO GEOTIFFS 
************************/

Export.image.toDrive({
  image: water.select('occurrence'),
  description: 'water_occurence_'+site_name,
  folder: 'Water_mask',
  crs: epsg,
  scale: 30,
  region: AOI
});

Export.image.toDrive({
  image: veg_product_01.select('NDVI'),
  description: 'VEG01_'+site_name+'_'+start_date.slice(0,4)+'_'+end_date.slice(0,4)+'_0_1_30p',
  folder: 'NDVI_max',
  crs: epsg,
  scale: 30,
  region: AOI
});

Export.image.toDrive({
  image: soil_moisture_01.select('constant'),
  description: 'SM01_global_'+site_name+'_'+start_date.slice(0,4)+'_'+end_date.slice(0,4)+'_0_1_30p',
  folder: 'SM',
  crs: epsg,
  scale: 30,
  region: AOI
});

