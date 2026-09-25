"""
Avarta Atmospheric Dataset Ingestion & Downloader Utility
Automates downloading real, open meteorological data for SIH Problem Statement 26078:
1. IBTrACS (NOAA/WMO/IMD Official North Indian Ocean Cyclone Best-Track Database)
2. ECMWF Open Data (Real 0.25° medium-range operational forecast stream)
3. Copernicus CDS ERA5 API script generator
"""

import os
import sys
import argparse
import urllib.request

# Ensure UTF-8 output on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def download_ibtracs_cyclones(output_dir: str = "data/raw") -> str:
    """
    Downloads the official WMO / NOAA / IMD North Indian Ocean Best-Track dataset.
    Contains exact coordinates, central pressure, and sustained wind for every cyclone
    including Super Cyclone Amphan (2020), Fani (2019), Biparjoy (2023), etc.
    """
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, "ibtracs_north_indian_ocean.csv")
    url = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.NI.list.v04r00.csv"
    
    print(f"[*] Downloading official IBTrACS North Indian Ocean Cyclone dataset from NOAA/WMO...")
    print(f"    Source URL: {url}")
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Avarta/2.4"})
    with urllib.request.urlopen(req, timeout=30) as response, open(out_file, "wb") as f:
        total_bytes = 0
        while True:
            chunk = response.read(65536)
            if not chunk:
                break
            f.write(chunk)
            total_bytes += len(chunk)
            
    print(f"[+] Successfully downloaded {total_bytes / (1024*1024):.2f} MB to: {out_file}")
    return out_file


def download_ecmwf_opendata_sample(output_dir: str = "data/raw") -> Optional[str]:
    """
    Fetches real, live ECMWF Open Data operational forecast fields (0.25° resolution).
    Variables: 10m Wind Speed (10u, 10v), Mean Sea Level Pressure (msl), 2m Temp (2t).
    """
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, "ecmwf_live_forecast_0p25.grib2")

    try:
        from ecmwf.opendata import Client
        print(f"[*] Connecting to ECMWF Open Data operational feed...")
        client = Client("ecmwf")
        client.retrieve(
            type="fc",
            step=24,
            param=["10u", "10v", "msl", "2t"],
            target=out_file
        )
        print(f"[+] Downloaded real ECMWF 0.25° GRIB2 forecast to: {out_file}")
        return out_file
    except Exception as e:
        print(f"[-] ECMWF OpenData download failed or timed out: {e}")
        print(f"    (Note: ECMWF servers occasionally rate-limit; the built-in NetCDF benchmarks in data/benchmarks/ remain fully operational.)")
        return None


def generate_era5_cds_script(output_file: str = "scripts/fetch_era5_amphan.py"):
    """
    Generates a Python script using the official Copernicus Climate Data Store (CDS) API
    to download the exact ERA5 reanalysis slice for Super Cyclone Amphan (May 2020).
    """
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    code = '''"""
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
'''
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"[+] Generated Copernicus CDS download script: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Avarta Atmospheric Dataset Ingestion Helper")
    parser.add_argument("--ibtracs", action="store_true", help="Download official WMO/IMD North Indian Ocean cyclone database")
    parser.add_argument("--ecmwf", action="store_true", help="Download live ECMWF 0.25° operational forecast GRIB2")
    parser.add_argument("--all", action="store_true", help="Download all available free public datasets")
    args = parser.parse_args()

    generate_era5_cds_script()

    if args.all or args.ibtracs:
        download_ibtracs_cyclones()

    if args.all or args.ecmwf:
        download_ecmwf_opendata_sample()

    if not (args.all or args.ibtracs or args.ecmwf):
        print("\nAvarta Dataset Download Helper:")
        print("  python scripts/download_sample_data.py --ibtracs  (Downloads official North Indian Ocean cyclone best tracks)")
        print("  python scripts/download_sample_data.py --ecmwf    (Downloads live ECMWF 0.25° GRIB2 forecast)")
        print("  python scripts/download_sample_data.py --all      (Downloads all public open data)")
