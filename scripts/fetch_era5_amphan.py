"""
Copernicus Climate Data Store (CDS API) ERA5 Downloader
Downloads the exact ERA5 reanalysis slice for Super Cyclone Amphan (May 16–21, 2020)
Bounding Box: Bay of Bengal [North: 26, West: 80, South: 10, East: 95]
"""
import cdsapi

c = cdsapi.Client()

print("[*] Requesting ERA5 hourly single-level atmospheric fields for Cyclone Amphan...")
c.retrieve(
    'reanalysis-era5-single-levels',
    {
        'product_type': 'reanalysis',
        'format': 'netcdf',
        'variable': [
            '10m_u_component_of_wind',
            '10m_v_component_of_wind',
            '2m_temperature',
            'mean_sea_level_pressure',
            'total_precipitation',
            'total_column_water_vapour',
        ],
        'year': '2020',
        'month': '05',
        'day': ['16', '17', '18', '19', '20', '21'],
        'time': [
            '00:00', '03:00', '06:00', '09:00',
            '12:00', '15:00', '18:00', '21:00',
        ],
        'area': [26, 80, 10, 95], # North, West, South, East (Bay of Bengal)
    },
    'data/raw/era5_amphan_2020.nc'
)
print("[+] Download complete: data/raw/era5_amphan_2020.nc")
