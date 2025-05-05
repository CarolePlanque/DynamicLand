This JavaScript code is designed to run on the Google Earth Engine platform. 
It was developed as part of the DynamicLand project, funded by the Swiss National Science Foundation through the SPARK programme, and is licensed under Creative Commons Attribution 4.0 International (© 2024 by Carole Planque).

## How to use:

### 1. Upload

* `git clone https://github.com/CarolePlanque/DynamicLand.git` - This will allow you to download all the necessary files.
* Upload the `main`, `level1`,`level2` scripts in your Google Earth Engine workspace 

### 2. Run:

* Open the `main` script
  
* Draw the area you would like to process, and name it 'geometry'
  
* Draw a training area and name it (e.g., here an example for `Sudd` is given)
  
* Set, where indicated:
  - the site_name variable with the name you have chosen (e.g., 'Sudd')
  - the training_area variable with the name you have chosen (e.g., Sudd)
  - the EPSG you would like the data to be exported with
  - the dates of the period of interest
    
* Run the `main` script.
