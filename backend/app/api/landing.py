"""Landing page visit tracking API"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.landing_visit import LandingVisit
import os

bp = Blueprint('landing', __name__)

# MaxMind GeoLite2 reader (lazy initialization)
_geo_reader = None

# Russian translations for cities/regions missing from DB-IP Lite free database
_RU_CITIES = {
    # Major Russian cities
    'Moscow': 'Москва', 'St Petersburg': 'Санкт-Петербург', 'Saint Petersburg': 'Санкт-Петербург',
    'Novosibirsk': 'Новосибирск', 'Yekaterinburg': 'Екатеринбург', 'Kazan': 'Казань',
    "Kazan'": 'Казань',
    'Nizhny Novgorod': 'Нижний Новгород', 'Chelyabinsk': 'Челябинск', 'Samara': 'Самара',
    'Omsk': 'Омск', 'Rostov-on-Don': 'Ростов-на-Дону', 'Ufa': 'Уфа', 'Krasnoyarsk': 'Красноярск',
    'Voronezh': 'Воронеж', 'Perm': 'Пермь', 'Volgograd': 'Волгоград', 'Krasnodar': 'Краснодар',
    'Saratov': 'Саратов', 'Tyumen': 'Тюмень', 'Tolyatti': 'Тольятти', 'Izhevsk': 'Ижевск',
    'Barnaul': 'Барнаул', 'Ulyanovsk': 'Ульяновск', 'Irkutsk': 'Иркутск', 'Khabarovsk': 'Хабаровск',
    'Yaroslavl': 'Ярославль', 'Vladivostok': 'Владивосток', 'Makhachkala': 'Махачкала',
    'Tomsk': 'Томск', 'Orenburg': 'Оренбург', 'Kemerovo': 'Кемерово', 'Novokuznetsk': 'Новокузнецк',
    'Ryazan': 'Рязань', 'Astrakhan': 'Астрахань', 'Penza': 'Пенза', 'Lipetsk': 'Липецк',
    'Tula': 'Тула', 'Kirov': 'Киров', 'Cheboksary': 'Чебоксары', 'Kaliningrad': 'Калининград',
    'Bryansk': 'Брянск', 'Kursk': 'Курск', 'Ivanovo': 'Иваново', 'Magnitogorsk': 'Магнитогорск',
    'Tver': 'Тверь', 'Stavropol': 'Ставрополь', 'Belgorod': 'Белгород', 'Sochi': 'Сочи',
    'Surgut': 'Сургут', 'Vladimir': 'Владимир', 'Arkhangelsk': 'Архангельск', 'Chita': 'Чита',
    'Smolensk': 'Смоленск', 'Kaluga': 'Калуга', 'Volzhskiy': 'Волжский', 'Kurgan': 'Курган',
    'Orel': 'Орёл', 'Murmansk': 'Мурманск', 'Tambov': 'Тамбов', 'Petrozavodsk': 'Петрозаводск',
    'Kostroma': 'Кострома', 'Novorossiysk': 'Новороссийск', 'Yoshkar-Ola': 'Йошкар-Ола',
    'Taganrog': 'Таганрог', 'Syktyvkar': 'Сыктывкар', 'Nizhnevartovsk': 'Нижневартовск',
    'Komsomolsk-on-Amur': 'Комсомольск-на-Амуре', 'Nalchik': 'Нальчик', 'Dzerzhinsk': 'Дзержинск',
    'Shakhty': 'Шахты', 'Orsk': 'Орск', 'Sterlitamak': 'Стерлитамак', 'Angarsk': 'Ангарск',
    'Blagoveshchensk': 'Благовещенск', 'Zheleznogorsk': 'Железногорск', 'Rybinsk': 'Рыбинск',
    'Prokopyevsk': 'Прокопьевск', 'Armavir': 'Армавир', 'Abakan': 'Абакан',
    'Norilsk': 'Норильск', 'Noyabrsk': 'Ноябрьск', 'Nefteyugansk': 'Нефтеюганск',
    'Severodvinsk': 'Северодвинск', 'Vladikavkaz': 'Владикавказ', 'Nizhnekamsk': 'Нижнекамск',
    # Moscow suburbs/districts → Москва
    'Orekhovo-Borisovo Yuzhnoye': 'Москва', 'Khimki': 'Москва', 'Mytishchi': 'Москва',
    'Podolsk': 'Москва', 'Zelenograd': 'Москва', 'Moskovskiy': 'Москва',
    'Cheremushki': 'Москва', 'Vostochnoe Degunino': 'Москва', 'Obruchevo': 'Москва',
    'Shcherbinka': 'Москва', 'Nikolina Gora': 'Москва', 'Belyaninovo': 'Москва',
    'Rzhavki': 'Москва', 'Zagorskie Dali': 'Москва', 'Obolensk': 'Москва',
    'Novopodrezkovo': 'Москва', "Sheremet'yevskiy": 'Москва', 'Tomilino': 'Москва',
    'Chernogolovka': 'Москва', 'Taldom': 'Москва', "Zavety Il'icha": 'Москва',
    'Ozyory': 'Москва', 'Chepelevo': 'Москва', 'Kolomna': 'Москва', 'Sychevo': 'Москва',
    'Rozhdestveno': 'Москва', 'Detchino': 'Москва', 'Bogorodskoye': 'Москва',
    "Arkhangel'skoye": 'Москва', "Ostashëvo": 'Москва',
    # SPb suburbs → Санкт-Петербург
    'Pargolovo': 'Санкт-Петербург', 'Shushary': 'Санкт-Петербург', 'Kolpino': 'Санкт-Петербург',
    'Gatchina': 'Санкт-Петербург', 'Siverskiy': 'Санкт-Петербург',
    # Suburbs → nearest major city
    'Kuznechikha': 'Нижний Новгород', 'Bolshoye Kozino': 'Нижний Новгород', 'Kamenka': 'Нижний Новгород',
    'Donskoy': 'Тула', 'Gritsovskiy': 'Тула',
    'Barsovo': 'Сургут', 'Salym': 'Сургут', 'Pyt-Yakh': 'Сургут',
    'Tolbazy': 'Уфа', 'Sterlibashevo': 'Уфа', 'Mednogorsk': 'Уфа',
    'Kochenevo': 'Новосибирск', 'Mochishche': 'Новосибирск', 'Sokur': 'Новосибирск',
    "Teren'ga": 'Ульяновск', "Otradnyy": 'Самара', "Borskoye": 'Самара',
    'Kugesi': 'Чебоксары', 'Vysokaya Gora': 'Казань', 'Yelabuga': 'Казань',
    'Shchelkun': 'Екатеринбург', "Sysert'": 'Екатеринбург', 'Nizhnyaya Salda': 'Екатеринбург',
    'Pervomayskiy': 'Екатеринбург', 'Sargazy': 'Екатеринбург', 'Murmino': 'Москва',
    'Belyy Yar': 'Сургут', 'Druzhba': 'Тюмень',
    'Kashin': 'Тверь', 'Kalyazin': 'Тверь', 'Korablino': 'Рязань',
    'Promyshlennovskiy': 'Кемерово', 'Znamensk': 'Астрахань',
    'Usolye-Sibirskoye': 'Иркутск', 'Kusa': 'Челябинск',
    "Fëdorovka": 'Тольятти', 'Kalinovo': 'Калуга',
    # Foreign (VPN / proxy)
    'Frankfurt': 'Франкфурт', 'Frankfurt am Main': 'Франкфурт',
    'Amsterdam': 'Амстердам', 'London': 'Лондон', 'Helsinki': 'Хельсинки',
    'Berlin': 'Берлин', 'Paris': 'Париж', 'Warsaw': 'Варшава',
    'Prague': 'Прага', 'Istanbul': 'Стамбул', 'Dubai': 'Дубай', 'Singapore': 'Сингапур',
    'Tokyo': 'Токио', 'New York': 'Нью-Йорк', 'Los Angeles': 'Лос-Анджелес',
    'Hong Kong': 'Гонконг', 'Toronto': 'Торонто', 'Atlanta': 'Атланта',
    'Ashburn': 'Вашингтон', 'North Bergen': 'Нью-Йорк',
    'Gravelines': 'Париж', 'Roubaix': 'Париж', 'Marseille': 'Марсель',
    'São Paulo': 'Сан-Паулу', 'San Francisco': 'Сан-Франциско', 'Santa Clara': 'Сан-Франциско',
    'Astana': 'Астана', 'Minsk': 'Минск', 'Riga': 'Рига',
    'Bengaluru': 'Бангалор', 'Melbourne': 'Мельбурн', 'Stockholm': 'Стокгольм',
    'Hangzhou': 'Ханчжоу', 'New Delhi': 'Дели', 'Tiraspol': 'Тирасполь',
}

_RU_REGIONS = {
    'Moscow': 'Москва', 'Moscow Oblast': 'Московская область',
    'St.-Petersburg': 'Санкт-Петербург', 'Saint Petersburg': 'Санкт-Петербург',
    'Novosibirsk Oblast': 'Новосибирская область', 'Sverdlovsk': 'Свердловская область',
    'Sverdlovsk Oblast': 'Свердловская область',
    'Tatarstan': 'Татарстан', 'Nizhny Novgorod Oblast': 'Нижегородская область',
    'Chelyabinsk': 'Челябинская область', 'Chelyabinsk Oblast': 'Челябинская область',
    'Samara Oblast': 'Самарская область', 'Omsk': 'Омская область', 'Omsk Oblast': 'Омская область',
    'Rostov': 'Ростовская область', 'Rostov Oblast': 'Ростовская область',
    'Bashkortostan': 'Башкортостан', 'Krasnoyarsk Krai': 'Красноярский край',
    'Voronezh Oblast': 'Воронежская область', 'Perm Krai': 'Пермский край', 'Perm': 'Пермский край',
    'Volgograd Oblast': 'Волгоградская область', 'Krasnodar Krai': 'Краснодарский край',
    'Saratov Oblast': 'Саратовская область', 'Tyumen Oblast': 'Тюменская область',
    'Udmurtia': 'Удмуртия', 'Altai Krai': 'Алтайский край',
    'Ulyanovsk Oblast': 'Ульяновская область', 'Irkutsk Oblast': 'Иркутская область',
    'Khabarovsk Krai': 'Хабаровский край', 'Yaroslavl Oblast': 'Ярославская область',
    'Primorye': 'Приморский край', 'Primorsky Krai': 'Приморский край',
    'Dagestan': 'Дагестан', 'Tomsk Oblast': 'Томская область',
    'Orenburg Oblast': 'Оренбургская область', 'Kemerovo Oblast': 'Кемеровская область',
    'Ryazan Oblast': 'Рязанская область', 'Astrakhan Oblast': 'Астраханская область',
    'Penza Oblast': 'Пензенская область', 'Lipetsk Oblast': 'Липецкая область',
    'Tula Oblast': 'Тульская область', 'Kirov Oblast': 'Кировская область',
    'Chuvashia': 'Чувашия', 'Kaliningrad Oblast': 'Калининградская область',
    'Bryansk Oblast': 'Брянская область', 'Kursk Oblast': 'Курская область',
    'Ivanovo Oblast': 'Ивановская область', 'Stavropol Krai': 'Ставропольский край',
    'Belgorod Oblast': 'Белгородская область', 'Vladimir Oblast': 'Владимирская область',
    'Arkhangelsk Oblast': 'Архангельская область', 'Zabaykalsky Krai': 'Забайкальский край',
    'Smolensk Oblast': 'Смоленская область', 'Kaluga Oblast': 'Калужская область',
    'Kurgan Oblast': 'Курганская область', 'Murmansk Oblast': 'Мурманская область',
    'Tambov Oblast': 'Тамбовская область', 'Karelia': 'Карелия',
    'Kostroma Oblast': 'Костромская область', 'Komi': 'Коми',
    'Khanty-Mansia': 'Ханты-Мансийский АО', 'Khanty-Mansiysk': 'Ханты-Мансийский АО',
    'Yamalo-Nenets': 'Ямало-Ненецкий АО', 'Kabardino-Balkaria': 'Кабардино-Балкария',
    'North Ossetia': 'Северная Осетия', 'Buryatia': 'Бурятия', 'Sakha': 'Якутия',
    'Kamchatka Krai': 'Камчатский край', 'Amur Oblast': 'Амурская область',
    'Sakhalin Oblast': 'Сахалинская область', 'Magadan Oblast': 'Магаданская область',
    'Tver Oblast': 'Тверская область', 'Novgorod Oblast': 'Новгородская область',
    'Pskov Oblast': 'Псковская область', 'Vologda Oblast': 'Вологодская область',
    # Foreign
    'England': 'Англия', 'Hessen': 'Гессен', 'North Holland': 'Северная Голландия',
    'Bavaria': 'Бавария', 'Ile-de-France': 'Иль-де-Франс',
}


def _translate(name, mapping):
    """Translate an English geo name to Russian using the mapping.
    Also handles GeoIP suffixes like 'Moscow (Tsentralnyy ...)' by
    stripping the parenthesized part and retrying the lookup.
    """
    if not name:
        return name
    result = mapping.get(name)
    if result:
        return result
    # Strip parenthesized suffix: "Frankfurt am Main (West)" → "Frankfurt am Main"
    if '(' in name:
        base = name[:name.index('(')].strip()
        result = mapping.get(base)
        if result:
            return result
    return name


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
        city_en = response.city.names.get('en')
        city = response.city.names.get('ru') or _translate(city_en, _RU_CITIES) or city_en
        country = response.country.names.get('ru') or response.country.names.get('en')
        region = None
        if response.subdivisions:
            region_en = response.subdivisions.most_specific.names.get('en')
            region = response.subdivisions.most_specific.names.get('ru') or \
                     _translate(region_en, _RU_REGIONS) or region_en
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
