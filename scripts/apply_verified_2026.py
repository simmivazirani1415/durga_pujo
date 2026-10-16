"""Apply research/verified-2026.md to src/data/listings.json."""
import json, sys
P = sys.argv[1]
L = json.load(open(P))
V = '2026-10-15'
D = {'start': '2026-10-16', 'end': '2026-10-21'}
BOLDSKY = {'label': 'Boldsky, 15 Oct 2026', 'url': 'https://www.boldsky.com/insync/pandal-hopping-in-bengaluru-2026-7-durga-puja-venues-worth-your-time-173351.html'}
ASIANET = {'label': 'Asianet Newsable, 9 Oct 2026', 'url': 'https://newsable.asianetnews.com/gallery/lifestyle/bengaluru-durga-puja-guide-2026-10-pandals-to-visit-for-memorable-celebration-pq2n2lo'}
DH = {'label': 'Deccan Herald, 14 Oct 2026', 'url': 'https://www.deccanherald.com/amp/story/india/karnataka/bengaluru/lotus-theme-red-and-white-decor-to-mark-durga-puja-in-bengaluru-4181746'}
MTS = {'label': 'My Travelling Stilettos (updated 12 Oct 2026)', 'url': 'https://mytravellingstilettos.com/top-places-to-see-durga-puja-in-bangalore/'}
def src(label, url): return {'label': label, 'url': url}

drop = {'karba-kanakapura', 'assam-idol-arrival', 'assam-sandhya-arati', 'assam-navami-performance'}
L = [x for x in L if x['id'] not in drop]
by = {x['id']: x for x in L}

def patch(i, **kw):
    x = by[i]
    for k, v in kw.items():
        if v is None: x.pop(k, None)
        else: x[k] = v
    x['verifiedOn'] = V

patch('assam-society', name='Assam Society of Bangalore: 14th Shree Shree Durga Puja',
      address='Freedom International School Ground, CA #33, Sector IV, HSR Layout, Bengaluru', editionYear=2026,
      dates=D, timings='Fri 16 Oct 6 am to Wed 21 Oct 12 pm', schedule=None, bhog={'access': 'Daily puja and bhog (times not published)'},
      programmes=['Daily puja and bhog', 'Cultural programmes', 'Dandiya night (date not published)', 'Food and flea stalls'],
      tags=['Rituals', 'Bhog', 'Cultural programmes', 'Dandiya'], status='published-2026',
      statusNote='Dates and venue published by the organiser. Programme dates and bhog times are not published yet.', directionsEnabled=True,
      sources=[src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/14th-shree-shree-durga-puja-2026-freedom-international-school-grounds-hsr-layout/200030738583909'), ASIANET])
patch('bss-hoodi', address='The Occasion Bangalore, Anup Layout, KR Puram Road, Hoodi, Bengaluru 560048',
      timings='Opens Fri 16 Oct 7 pm', schedule=[
        {'date': '2026-10-16', 'time': '7 pm', 'activity': 'Opening'},
        {'date': '2026-10-17', 'time': '11 am', 'activity': 'Pushpanjali (daily, 11 am)'},
        {'date': '2026-10-17', 'time': '7 pm', 'activity': 'Sandhya arati (daily, 7 pm)'},
        {'date': '2026-10-19', 'time': '7:26 am', 'activity': 'Sandhi Puja'},
        {'date': '2026-10-21', 'time': '10:30 am', 'activity': 'Sindoor Khela'}],
      statusNote='Dates, venue and daily timings published by the organiser.',
      sources=[src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/bss-durga-puja-2026/200030826283056'), ASIANET])
patch('udaan-whitefield', name='Udaan Socio-Cultural Society: Uma Durga Puja',
      schedule=[{'date': '2026-10-16', 'time': '9 am', 'activity': 'Shashthi puja'},
                {'date': '2026-10-16', 'time': '10:30 am', 'activity': 'Pushpanjali'},
                {'date': '2026-10-16', 'time': '6:30 pm', 'activity': 'Arati'},
                {'date': '2026-10-16', 'time': '7 pm', 'activity': 'Bodhon'}],
      statusNote='Dates, venue and the Shashthi schedule published by the organiser. Check the exact entrance before you go.',
      sources=[src('Udaan: 2026 schedule', 'https://www.udaanfamily.org/schedule'), src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/uma-durga-puja-2026/200030778270557')])
patch('rt-nagar-trust', venueName='Palace Grounds, Gate 9 (Princess Green)', address='Princess Green, Gate 9, Palace Grounds, Bellary Road, Bengaluru',
      dates={'start': '2026-10-15', 'end': '2026-10-21'}, category='Big Palace Grounds celebration, Kolkata idol',
      programmes=['Kolkata idol and theme', 'Around 40 stalls', 'Free community lunch', 'Artists on four evenings (names not published)'],
      tags=['Cultural evening', 'Food stalls', 'Community lunch'],
      statusNote='Confirmed by three 2026 news guides. Boldsky lists 15 to 21 October (15 October is likely the fair); others list 16 to 21 October.',
      sources=[BOLDSKY, ASIANET, MTS])
patch('ksuc-bilekahalli', editionYear=2026, dates=D, statusNote='The organiser names Siri Convention Hall as its 2026 venue (14th year). Dates are from a 2026 directory; the organiser has not published them.',
      sources=[src('KSUC Bangalore: Durga Puja venue 2026', 'https://ksucbangalore.org/'), src('Newzchain 2026 puja directory', 'https://pujo.newzchain.com/pujas/ksuc-durga-puja-2026')])
patch('pbca-ktpo', statusNote='The organiser lists KTPO and a 23rd edition but shows no 2026 dates. Confirm before you go.',
      sources=[src('PBCA website', 'https://pbca.in/'), MTS])
patch('bengalee-association', address='1/A Assaye Road, Shivan Chetty Garden, near Ulsoor Lake, Bengaluru 560042', pincode='560042',
      editionYear=2026, dates=D, status='published-2026', statusNote='The organiser lists Shri Shri Durga Puja for October 2026, and two news guides give 16 to 21 October. Bhog times are not published.',
      sources=[src('The Bengalee Association', 'https://thebengaleeassociation.com/'), BOLDSKY, ASIANET])
patch('wca-whitefield', venueName='Behind Mahaveer Tranquil, Palm Meadows', address='Behind Mahaveer Tranquil, Palm Meadows, Nallurhalli, Whitefield, Bengaluru',
      editionYear=2026, dates=D, category='24th year, "Sun Chariot" theme', programmes=['Theme: Sun Chariot', 'Fair with food stalls and rides'],
      tags=['Community', 'Theme pandal', 'Fair'], status='published-2026', directionsEnabled=True,
      statusNote='Venue and theme from a 2026 news guide. Dates are from a 2026 directory, not the organiser.',
      sources=[BOLDSKY, MTS, src('Newzchain 2026 puja directory', 'https://pujo.newzchain.com/pujas/whitefield-cultural-association-durga-puja-2026')])
patch('ebca-whitefield', venueName='Sri Manjunatha Swamy Kalyana Mantapa', address='Sri Manjunatha Swamy Kalyana Mantapa, Sannatammanahalli, Katamnallur, Whitefield, Bengaluru 560049', pincode='560049',
      editionYear=2026, dates=D, entry='free', bhog={'time': 'Daily 11:30 am–1 pm and 7–8:30 pm', 'access': 'Free'},
      programmes=['Maddox Square Book Fair', 'Patachitra live demo', 'Dhunuchi Naach and Dandiya night', 'Sindur Khela and Bijoya Sammilani'],
      tags=['Culture', 'Art', 'Free bhog'], status='published-2026', directionsEnabled=True,
      statusNote='Dates, venue and bhog times published by the organiser. Free entry.',
      sources=[src('EBCA: Durga Puja 2026', 'https://ebcafamily.com/durga-puja-bangalore-2026.php'), src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/ebca-maha-durga-puja-2026-whitefield-bangalore-tickets/80003135313046')])
patch('sarathi-koramangala', venueName='Mangala Kalyana Mantapa', address='Mangala Kalyana Mantapa, Ganapathi Temple Road, 7th Block, Koramangala, Bengaluru 560030', pincode='560030',
      editionYear=2026, dates=D, timings='11 am–10:45 pm', status='published-2026', directionsEnabled=True,
      statusNote='The organiser\'s 2026 page names Mangala Kalyana Mantapa (24th year). The "5th Block ground" listing belongs to a different puja. Daily hours are from a 2026 directory.',
      sources=[src('Sarathi: 2026 Durga Puja event', 'https://sarathionline.org/durga-puja-event-bangalore/'), src('Newzchain 2026 puja directory', 'https://pujo.newzchain.com/pujas/sarathi-socio-cultural-trust-durga-puja-2026')])
patch('tridharaa-jp-nagar', venueName='Keerthi Convention Hall', address='Keerthi Convention Hall, Kothnur Dinne Main Road, opposite BWSSB water tank, JP Nagar 8th Phase, Bengaluru 560076', pincode='560076',
      editionYear=2026, dates=D, timings='7 am–11 pm', category='Theme: "Three Streams. One Heart."', status='published-2026', directionsEnabled=True,
      statusNote='From a 2026 pandal directory page; the organiser\'s own site was down when checked.',
      sources=[src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/tridharaa-sarbojonin-durgotsav-jp-nagar-8th-phase-bengaluru')])
patch('sanskritik-jp-nagar', venueName='Elite Banquet Hall', address='Elite Banquet Hall, Puttenahalli Road, KR Layout, JP Nagar 6th Phase, Bengaluru 560078', pincode='560078',
      editionYear=2026, dates=D, timings='Fri 16 Oct 3 pm to Wed 21 Oct 12 pm', entry='free', bhog={'access': 'Bhog on four days (times not published)'},
      programmes=['Bhog on four days', 'Dhunuchi'], tags=['Community', 'Bhog', 'Free entry'], status='published-2026', directionsEnabled=True,
      statusNote='Dates and venue published by the organiser. One organiser page also shows 17–21 October.',
      sources=[src('Sanskritik', 'https://sanskritik.org/'), src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/sanskritik-durga-puja-2026-jp-nagar-bangalore/80002656051188')])
patch('rgbcf-hosa-road', name='Rayasandra Gattahalli Bengali Cultural Forum (RGBCF) Durga Puja', organiser='Rayasandra Gattahalli Bengali Cultural Forum',
      venueName='Rayasandra Main Road, Gattahalli', address='Rayasandra Main Road, Gattahalli, near Hosa Road, Bengaluru 560099', pincode='560099', subArea='Electronic City',
      editionYear=2026, dates={'start': '2026-10-17', 'end': '2026-10-20'}, category='4th year', status='published-2026', directionsEnabled=True,
      statusNote='From a 2026 pandal directory page. Evening programmes 17–20 October.',
      sources=[src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/rgbcf-rayasandra-near-hosa-road-electronic-city-bengaluru')])
patch('begur-trust', name='Begur Bengali Socio Cultural Trust (BBCA) Durga Puja', venueName='Milana Greens',
      address='Milana Greens, 275/36/2, Mylasandra Road, Suraksha Nagar, Yelenahalli, Begur, Bengaluru 560068', pincode='560068',
      editionYear=2026, dates=D, programmes=['Sonajhuri Mela and flea market', 'Dandiya night with DJ Cheez', 'Rupankar Bagchi live', 'Ashmita Kar with InSync Band', 'Sindoor Khela and Bijoya'],
      tags=['Community', 'Live music', 'Mela'], status='published-2026', directionsEnabled=True,
      statusNote='Dates, venue and evening line-up published by the organiser.',
      sources=[src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/durga-puja-2026/80001542059737'), src('Begur Bengali: Durga Puja 2026', 'https://begurbengali.in/durga-puja-2026/')])

def pandal(i, name, area, sub, venue, address, *, organiser=None, category=None, dates=D, timings=None, programmes=None, tags=None,
           status='published-2026', note='', directions=True, sources=(), entry=None, edition=2026, pincode=None):
    x = {'id': i, 'kind': 'pandal', 'name': name}
    if organiser: x['organiser'] = organiser
    if category: x['category'] = category
    x.update({'venueName': venue, 'address': address, 'area': area, 'subArea': sub})
    if pincode: x['pincode'] = pincode
    if edition: x['editionYear'] = edition
    if dates: x['dates'] = dates
    if timings: x['timings'] = timings
    if programmes: x['programmes'] = programmes
    if entry: x['entry'] = entry
    x['tags'] = tags or ['Community']
    x.update({'status': status, 'statusNote': note, 'directionsEnabled': directions, 'sources': list(sources), 'verifiedOn': V})
    L.append(x)

pandal('barsha-ecity', 'BARSHA Maha Durga Puja', 'south-east', 'Electronic City', 'South Avenue Grounds',
       'South Avenue Grounds, behind Electronic City metro, entry from NICE Road toll junction, Konappana Agrahara, Bengaluru 560100', pincode='560100',
       organiser='BARSHA', category='11th edition, theme "ANCHAL", Kumartuli idol', timings='Fri 16 Oct 8 am to Wed 21 Oct 12:30 pm',
       programmes=['Theme: ANCHAL', 'Kumartuli idol', 'Celebrity performances (dates not listed)'], tags=['Theme pandal', 'Big celebration', 'Performances'],
       note='Dates, venue and theme published by the organiser and two 2026 news guides.',
       sources=[src('BARSHA: Durga Puja 2026', 'https://www.barshabangalore.org/event/best-durga-puja-in-bangalore-2026/'), BOLDSKY, ASIANET])
pandal('ecca-ecity', 'Electronic City Cultural Association (ECCA) Durga Puja', 'south-east', 'Electronic City', 'White Feather Convention Centre',
       'White Feather Convention Centre, NICE Toll Gate, Konappana Agrahara, Electronic City, Bengaluru', organiser='Electronic City Cultural Association',
       programmes=['ECCA Dandiya Night \'26, Tue 20 Oct (paid)'], tags=['Community', 'Dandiya'],
       note='Venue confirmed by the organiser\'s 2026 Dandiya listing and a 2026 news guide. Puja dates are from a 2026 directory.',
       sources=[src('ECCA Dandiya Night \'26 on allevents.in', 'https://allevents.in/bangalore/ecca-dandiya-night-26-electronic-city/4100030742282513'), ASIANET, src('Newzchain 2026 puja directory', 'https://pujo.newzchain.com/pujas/electronic-city-cultural-association-durga-puja-2026')])
pandal('utsav-bilekahalli', 'Utsav Bangalore: 15th Durga Puja', 'south-east', 'Bilekahalli', 'Mulki Sundar Ram Shetty Sabhangana',
       'Mulki Sundar Ram Shetty Sabhangana, 9th Main Road, Vijaya Bank Layout, Bengaluru 560076', pincode='560076', organiser='Utsav Bangalore',
       dates={'start': '2026-10-15', 'end': '2026-10-21'}, timings='Opens Thu 15 Oct 7:30 pm', programmes=['Bhog', 'Dhunuchi', 'Flea market'], tags=['Bhog', 'Dhunuchi', 'Flea market'],
       note='Dates and venue published by the organiser.',
       sources=[src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/utsav-durgapuja/200030712380539'), src('Utsav Bangalore', 'https://utsav-bangalore.com/')])
pandal('binb-dairy-circle', 'Bengali in Bangalore (BinB) Durgotsav', 'south-east', 'Bannerghatta Road', 'Chandrodaya Convention Center',
       'Chandrodaya Convention Center, 39/2 Bannerghatta Main Road, Dairy Circle, Bengaluru', organiser='Bengali in Bangalore',
       timings='Fri 16 Oct 10 am to Wed 21 Oct 1 pm', programmes=['Dhunuchi', 'Cultural programmes', 'Food stalls'], tags=['Cultural programmes', 'Food stalls'],
       note='Dates and venue published by the organiser.',
       sources=[src('BinB: Durga Puja 2026', 'https://www.bengaliinbangalore.org/event/durga-puja-2026/'), src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/binb-durgotsav-2026/200030420755254')])
pandal('eisha-hsr', 'EISHA Durga Puja', 'hsr-layout', 'HSR Layout', 'HSR BDA Complex', 'HSR BDA Complex, 12th Main Road, Sector 6, HSR Layout, Bengaluru',
       organiser='East Indian Social HSR Association (EISHA)', category='11th year, Jamini Roy theme', programmes=['Jamini Roy theme', 'Chhau dance, Mon 19 Oct'],
       tags=['Theme pandal', 'Pet-friendly'], note='Venue, theme and programme from two 2026 news guides.', sources=[BOLDSKY, MTS])
pandal('sebba-hsr', 'SEBBA Durga Puja', 'hsr-layout', 'HSR Layout', 'The White House Convention Centre',
       'The White House Convention Centre, 4B, 14th Main Road, next to BDA Complex, Sector 6, HSR Layout, Bengaluru', organiser='South East Bengaluru Bengali Association (SEBBA)',
       category='Theme: "Oitijhye Ananya"', dates={'start': '2026-10-17', 'end': '2026-10-21'}, tags=['Theme pandal', 'Community'],
       note='Dates, venue and theme published by the organiser.',
       sources=[src('SEBBA', 'https://sebba.in/'), src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/south-east-bengaluru-bengali-association-durga-puja-hsr-layout-bengaluru')])
pandal('apoorba-bellandur', 'APOORBA Sharadotsav', 'hsr-layout', 'Bellandur', 'Temple Ground, Adarsh Palm Retreat Villas',
       'Temple Ground, Adarsh Palm Retreat Villas, Bellandur, Bengaluru 560103', pincode='560103', organiser='APOORBA', entry='free',
       programmes=['Dandiya night, Sat 17 Oct', 'Dhunuchi competition and DJ night, Tue 20 Oct', 'Sindoor Khela, Wed 21 Oct'], tags=['Free entry', 'Dandiya', 'Dhunuchi'],
       note='Dates, venue and programme published by the organiser. Free entry.', sources=[src('APOORBA Pujo', 'https://www.apoorbapujo.in/')])
pandal('amra-kajon-koramangala', 'Amra Kajon Bengaluru Cultural Association Durga Puja', 'koramangala', 'Koramangala', 'Bheemachandra Kala Mantapa',
       'Bheemachandra Kala Mantapa, 1st Main Road, 7th Block, Koramangala, Bengaluru 560095', pincode='560095', organiser='Amra Kajon Bengaluru Cultural Association',
       programmes=['Aritra Dasgupta, Sun 18 Oct', 'Chandrika Bhattacharya, Mon 19 Oct', 'Jimut Roy, Tue 20 Oct'], tags=['Live music', 'Community'],
       note='From a 2026 pandal directory page.', sources=[src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/amra-kajon-bengaluru-cult')])
pandal('varthur-ba', 'Varthur Bengali Association Durga Puja', 'whitefield-hoodi', 'Varthur', 'CSK Mall', 'CSK Mall, Varthur Main Road, Gunjur, Bengaluru 560049', pincode='560049',
       organiser='Varthur Bengali Association', category='Theme: "Doshe Doshobhuja"', programmes=['Disco Dandiya with DJ Yash, Sat 17 Oct', 'Musication, Mon 19 Oct', 'Alpin, Tue 20 Oct'],
       tags=['Theme pandal', 'Live music', 'Dandiya'], note='Dates, venue, theme and programme published by the organiser.',
       sources=[src('Varthur Bengali Association: Durga Puja', 'https://varthurbengaliassociation.in/durga-puja/')])
pandal('jbca-kr-puram', 'Jagriti Bangiyo Cultural Association (JBCA) Durga Puja', 'whitefield-hoodi', 'KR Puram', 'ITI Ground', 'ITI Ground, beside the Hanging Bridge, KR Puram, Bengaluru',
       organiser='Jagriti Bangiyo Cultural Association', programmes=['All-women dhak team', 'Food stalls and rides'], tags=['Dhak', 'Food stalls', 'Fair'],
       note='Venue and programme from two 2026 news guides.', sources=[BOLDSKY, MTS])
pandal('uttaran-kasturinagar', 'Uttaran "Dashabhuja 2026"', 'indiranagar', 'Kasturinagar', 'New Horizon College', 'New Horizon College, Kasturinagar, Bengaluru',
       organiser='Uttaran', category='Red-and-white traditional theme', programmes=['Red-and-white traditional decor', 'Recycled materials and alpona'], tags=['Theme pandal', 'Traditional'],
       note='From a 2026 Deccan Herald report. Check the exact entrance before you go.', sources=[DH])
pandal('bdpc-palace-grounds', 'Bengaluru Durga Puja Committee (BDPC)', 'rt-nagar-palace-grounds', 'Palace Grounds', 'The Grand Castle, Palace Grounds Gate 6',
       'The Grand Castle, Palace Grounds Gate 6, Bellary Road, near Mekhri Circle, Bengaluru', organiser='Bengaluru Durga Puja Committee',
       programmes=['Bhog', 'Cultural programme', 'Food court'], tags=['Bhog', 'Cultural programme', 'Food court'],
       note='Venue and programme from two 2026 news guides.', sources=[BOLDSKY, ASIANET])
pandal('oikotan-jakkur', 'Oikotan Hebbal Cultural Society Durga Puja', 'rt-nagar-palace-grounds', 'Hebbal–Jakkur', 'EBISU Convention Center',
       'EBISU Convention Center, Hegde Nagar Main Road, Jakkur, opposite Regal Hospital, Bengaluru', organiser='Oikotan Hebbal Cultural Society', category='New venue for 2026, theme "Egypt"',
       programmes=['Theme: Egypt', 'Rahul Dutta, Mon 19 Oct', 'Lopamudra Mitra, Tue 20 Oct'], tags=['Theme pandal', 'Live music'],
       note='New 2026 venue, theme and artists from two 2026 news guides.', sources=[BOLDSKY, MTS])
pandal('jayamahal-sarbajanin', 'Jayamahal Sarbajanin Durga Puja', 'rt-nagar-palace-grounds', 'Jayamahal', 'Jayamahal Ladies Club Ground',
       'Jayamahal Ladies Club Ground, next to Jayamahal Park, Bengaluru', organiser='Jayamahal Sarbajanin', category='72nd year', dates=None, edition=None,
       status='awaiting-confirmation', directions=False,
       note='A 2026 news guide names this puja, but only a blog gives the venue and edition, and 2026 dates are not published. Directions are off until the venue is confirmed.',
       sources=[ASIANET, MTS])
pandal('nbcs-mahalakshmipuram', 'North Bangalore Cultural Samiti: 49th Durga Puja', 'malleswaram', 'Mahalakshmipuram', 'Bangalore Kali Bari',
       'Bangalore Kali Bari, Nandini Layout / Mahalakshmipuram, Bengaluru', organiser='North Bangalore Cultural Samiti', category='Theme "Shatadal" (lotus), idol by Tarun Pal',
       programmes=['Theme: Shatadal (lotus)', 'Idol by Tarun Pal'], tags=['Theme pandal', 'Kali Bari'],
       note='From a 2026 Deccan Herald report. The exact street address is not in the article.', sources=[DH])
pandal('sca-indiranagar', 'Socio-Cultural Association, Indiranagar: 58th Durga Puja', 'indiranagar', 'HAL 3rd Stage', 'Sishu Griha Senior School Ground',
       'Sishu Griha Senior School Ground, HAL 3rd Stage, New Tippasandra, Bengaluru', organiser='Socio-Cultural Association, Indiranagar', category='58th year',
       dates=None, edition=None, status='awaiting-confirmation', directions=False,
       note='A 2026 news guide names this puja but says "HAL 2nd Stage"; a blog says Sishu Griha School, HAL 3rd Stage. Dates are not published. Directions are off until the venue is confirmed.',
       sources=[ASIANET, MTS])

def event(i, name, rel, date, timings, category, sources, end=None, entry=None):
    p = by.get(rel) or next(x for x in L if x['id'] == rel)
    x = {'id': i, 'kind': 'event', 'name': name, 'organiser': p.get('organiser') or p['name'], 'category': category,
         'venueName': p.get('venueName'), 'address': p.get('address'), 'area': p['area'], 'subArea': p.get('subArea'), 'editionYear': 2026,
         'dates': {'start': date, 'end': end or date}}
    if timings: x['timings'] = timings
    if entry: x['entry'] = entry
    x.update({'tags': [category], 'status': 'published-2026', 'directionsEnabled': p['directionsEnabled'], 'relatedTo': rel, 'sources': sources, 'verifiedOn': V})
    L.append(x)

BEG = [src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/durga-puja-2026/80001542059737')]
event('begur-mela', 'Opening, Sonajhuri Mela and flea market', 'begur-trust', '2026-10-16', None, 'Mela', BEG)
event('begur-dandiya', 'Dandiya night with DJ Cheez', 'begur-trust', '2026-10-17', '7:30 pm', 'Dandiya', BEG)
event('begur-rupankar', 'Rupankar Bagchi live', 'begur-trust', '2026-10-18', '7:30 pm', 'Live music', BEG)
event('begur-ashmita', 'Ashmita Kar with InSync Band', 'begur-trust', '2026-10-20', '7:30 pm', 'Live music', BEG)
event('begur-sindoor', 'Sindoor Khela and Bijoya', 'begur-trust', '2026-10-21', None, 'Ritual', BEG)
event('bss-sindoor', 'Sindoor Khela', 'bss-hoodi', '2026-10-21', '10:30 am', 'Ritual', [src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/bss-durga-puja-2026/200030826283056')])
event('oikotan-rahul-dutta', 'Rahul Dutta live', 'oikotan-jakkur', '2026-10-19', 'Night', 'Live music', [BOLDSKY, MTS])
event('oikotan-lopamudra', 'Lopamudra Mitra live', 'oikotan-jakkur', '2026-10-20', 'Night', 'Live music', [BOLDSKY, MTS])
event('eisha-chhau', 'Chhau dance performance', 'eisha-hsr', '2026-10-19', '7 pm', 'Dance', [BOLDSKY, MTS])
TRI = [src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/tridharaa-sarbojonin-durgotsav-jp-nagar-8th-phase-bengaluru')]
event('tridharaa-mahishasura', 'Mahishasura Mardini', 'tridharaa-jp-nagar', '2026-10-16', '8 pm', 'Performance', TRI)
event('tridharaa-rahul-deb', 'Rahul Deb live', 'tridharaa-jp-nagar', '2026-10-19', '8–10 pm', 'Live music', TRI)
AK = [src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/amra-kajon-bengaluru-cult')]
event('amrakajon-aritra', 'Aritra Dasgupta musical night', 'amra-kajon-koramangala', '2026-10-18', '7–10 pm', 'Live music', AK)
event('amrakajon-chandrika', 'Chandrika Bhattacharya live', 'amra-kajon-koramangala', '2026-10-19', '7–10 pm', 'Live music', AK)
event('amrakajon-jimut', 'Jimut Roy live', 'amra-kajon-koramangala', '2026-10-20', '7–10 pm', 'Live music', AK)
RG = [src('Pujorpoth 2026 pandal page', 'https://pujorpoth.in/pandal/rgbcf-rayasandra-near-hosa-road-electronic-city-bengaluru')]
event('rgbcf-mehroon', 'Mehroon live', 'rgbcf-hosa-road', '2026-10-17', '7–10 pm', 'Live music', RG)
event('rgbcf-musication', 'Musication live', 'rgbcf-hosa-road', '2026-10-18', '7–10 pm', 'Live music', RG)
event('rgbcf-amader-aashor', 'Amader Aashor live', 'rgbcf-hosa-road', '2026-10-19', '7–10 pm', 'Live music', RG)
event('rgbcf-dandiya', 'Dandiya night with DJ Heaven', 'rgbcf-hosa-road', '2026-10-20', '7–10 pm', 'Dandiya', RG)
VB = [src('Varthur Bengali Association: Durga Puja', 'https://varthurbengaliassociation.in/durga-puja/')]
event('varthur-dandiya', 'Disco Dandiya with DJ Yash', 'varthur-ba', '2026-10-17', '7–9:30 pm', 'Dandiya', VB + [src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/dandiya-durga-puja/3900030829424309')])
event('varthur-musication', 'Musication, the band', 'varthur-ba', '2026-10-19', None, 'Live music', VB)
event('varthur-alpin', 'Alpin, the rock band', 'varthur-ba', '2026-10-20', None, 'Live music', VB)
EB = [src('EBCA: Durga Puja 2026', 'https://ebcafamily.com/durga-puja-bangalore-2026.php')]
event('ebca-book-fair', 'Maddox Square Book Fair opens', 'ebca-whitefield', '2026-10-16', None, 'Fair', EB)
event('ebca-patachitra', 'Patachitra live demo', 'ebca-whitefield', '2026-10-17', None, 'Art', EB)
event('ebca-dhunuchi', 'Dhunuchi Naach and Dandiya night', 'ebca-whitefield', '2026-10-20', None, 'Dance', EB)
event('ebca-sindur', 'Sindur Khela and Bijoya Sammilani', 'ebca-whitefield', '2026-10-21', None, 'Ritual', EB)
AP = [src('APOORBA Pujo', 'https://www.apoorbapujo.in/')]
event('apoorba-dandiya', 'Dandiya night', 'apoorba-bellandur', '2026-10-17', 'Evening', 'Dandiya', AP)
event('apoorba-dhunuchi', 'Dhunuchi competition, then DJ night', 'apoorba-bellandur', '2026-10-20', 'Evening', 'Dance', AP)
event('apoorba-sindoor', 'Sindoor Khela', 'apoorba-bellandur', '2026-10-21', '12–1:30 pm', 'Ritual', AP)
event('ecca-dandiya', "ECCA Dandiya Night '26 with Hitesh & Rishabh Mehta live", 'ecca-ecity', '2026-10-20', '8–11 pm', 'Dandiya',
      [src('Organiser listing on allevents.in', 'https://allevents.in/bangalore/ecca-dandiya-night-26-electronic-city/4100030742282513')], entry='ticketed')
L[-1]['statusNote'] = 'Paid entry: ₹700 single, ₹1,000 couple.'
# the Hilton food festival is a food event, not tied to a pandal
L.append({'id': 'hilton-puja-on-a-plate', 'kind': 'event', 'name': '"Puja on a Plate" Bengali food festival', 'organiser': 'Hilton Bangalore Embassy GolfLinks',
          'category': 'Food festival', 'venueName': 'DYN, Hilton Bangalore Embassy GolfLinks', 'address': 'Hilton Bangalore Embassy GolfLinks, Embassy GolfLinks Business Park, Domlur, Bengaluru',
          'area': 'indiranagar', 'subArea': 'Domlur', 'editionYear': 2026, 'dates': {'start': '2026-10-19', 'end': '2026-10-20'}, 'timings': '12:30–3 pm',
          'entry': 'ticketed', 'tags': ['Food festival', 'Bengali food'], 'status': 'published-2026', 'statusNote': 'Priced at ₹2,500 plus taxes.',
          'directionsEnabled': True, 'sources': [src('PNI News, 14 Oct 2026', 'https://www.pninews.com/puja-on-a-plate-hilton-bangalore-embassy-golflinks-hosts-a-bengali-food-festival/')], 'verifiedOn': V})

# tidy: no None values
for x in L:
    for k in [k for k, v in x.items() if v is None]: del x[k]
json.dump(L, open(P, 'w'), indent=1, ensure_ascii=False)
import collections
print(len(L), collections.Counter(x['kind'] for x in L), collections.Counter(x['area'] for x in L if x['kind'] == 'pandal'))
