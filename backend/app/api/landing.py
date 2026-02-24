"""Landing page visit tracking API"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.landing_visit import LandingVisit
import os

bp = Blueprint('landing', __name__)

# MaxMind GeoLite2 reader (lazy initialization)
_geo_reader = None


def get_geo_reader():
    """Lazily initialize MaxMind GeoLite2 reader"""
    global _geo_reader
    if _geo_reader is not None:
        return _geo_reader

    mmdb_path = os.environ.get('GEOIP_DB_PATH', '/app/data/GeoLite2-City.mmdb')
    if not os.path.exists(mmdb_path):
        return None

    try:
        import geoip2.database
        _geo_reader = geoip2.database.Reader(mmdb_path)
        return _geo_reader
    except Exception:
        return None


def lookup_geo(ip_address):
    """Look up city/country/region from IP address using MaxMind GeoLite2"""
    reader = get_geo_reader()
    if not reader or not ip_address:
        return None, None, None

    # Skip private/local IPs
    private_prefixes = ('127.', '10.', '192.168.', '::1', 'fc00:', 'fe80:')
    private_prefixes += tuple(f'172.{i}.' for i in range(16, 32))
    if ip_address.startswith(private_prefixes):
        return None, None, None

    try:
        response = reader.city(ip_address)
        city = response.city.names.get('ru') or response.city.names.get('en')
        country = response.country.names.get('ru') or response.country.names.get('en')
        region = None
        if response.subdivisions:
            region = response.subdivisions.most_specific.names.get('ru') or \
                     response.subdivisions.most_specific.names.get('en')
        return city, country, region
    except Exception:
        return None, None, None


@bp.route('/visit', methods=['POST'])
def track_visit():
    """Log a landing page visit"""
    ip_address = request.headers.get('X-Real-IP') or \
                 request.headers.get('X-Forwarded-For', '').split(',')[0].strip() or \
                 request.remote_addr

    user_agent = request.headers.get('User-Agent', '')[:512]
    referrer = (request.json or {}).get('referrer', '')[:500] if request.is_json else ''

    city, country, region = lookup_geo(ip_address)

    visit = LandingVisit(
        ip_address=ip_address,
        city=city,
        country=country,
        region=region,
        user_agent=user_agent,
        referrer=referrer or None,
    )
    try:
        db.session.add(visit)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({'ok': True}), 201
