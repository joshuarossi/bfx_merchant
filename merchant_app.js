if (Meteor.isClient) {
    Meteor.startup(function () {
        Session.setDefault('amount', 1);
        Session.setDefault('address', "");
        Session.setDefault('uri', 'bitcoin:1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur?amount=0.01');
        Session.setDefault('price', 0);
        Session.setDefault('api_key', '');
        var url = "https://api.bitfinex.com/v1";
        var w = new WebSocket("wss://api2.bitfinex.com:3000/ws");
        w.onopen = function () {
            w.send(JSON.stringify({
                "event": "subscribe",
                "channel": "ticker",
                "pair": "BTCUSD"
            }))
        };
        w.onmessage = function (msg) {
            msg = JSON.parse(msg.data);
            if (msg[0] == 5) {
                Session.set('price', msg[1]);
            }
        };
    });
    function genURI() {
        return "bitcoin:" + Session.get('address') + "?amount=" + (Session.get('amount') / Session.get('price'));
    }

    Session.set('uri', genURI());
    Template.registerHelper("convert", function () {
        return Session.get('amount') / Session.get('price');
    });
    Template.registerHelper("address", function () {
        return Session.get('address');
    });
    Template.registerHelper("uri", function () {
        return genURI();
    });
    Template.registerHelper("amount", function () {
        return Session.get("amount");
    });
    Template.registerHelper("price", function () {
        return Session.get("price");
    });
    Template.registerHelper('authed', function () {
        if (Session.get('api_key') != ''){
            return true
        }
        else {
            return false
        }
    });
    function handleTransaction(msg){
        if (msg != 'ignore') {
            msg = JSON.parse(msg.data);
            console.log(msg);
            var amount = (msg.x.out[0].value / 100000000.0) * Session.get('price');
            alert("received " + amount);
        }
        var api_key = Session.get('api_key');
        var api_secret = Session.get('api_secret');
        var payload = {
            "request": "/v1/deposit/new",
            "nonce": Date.now().toString(),
            "method": "bitcoin",
            "wallet_name": "exchange",
            "renew": 1
        };
        payload = JSON.stringify(payload);
        payload = Base64.encode(payload);
        //to_be_hashed = to_be_hashed.slice(1, -1);
        var shaObj = new jsSHA("SHA-384", "TEXT");
        shaObj.setHMACKey(api_secret, "TEXT");
        shaObj.update(payload);
        var signature = shaObj.getHMAC("HEX");
        //var signature = crypto.createHmac("sha384", api_secret).update(payload).digest('hex');
        var options = {
            headers: {
                'X-BFX-APIKEY': api_key,
                'X-BFX-PAYLOAD': payload,
                'X-BFX-SIGNATURE': signature
            },
            json: payload
        };
        HTTP.post("https://api.bitfinex.com/v1/deposit/new", options, function (error, data) {
            Session.set('address', data.data.address.address);
        });
    }
    Template.auth.events({
        'submit': function () {
            event.preventDefault();
            var api_key = event.target.api_key.value;
            var api_secret = event.target.api_secret.value;
            Session.set('api_key', api_key);
            Session.set('api_secret', api_secret);
            event.target.api_key.value = '';
            event.target.api_secret.value = '';
            handleTransaction('ignore');
        }
    });
    Template.get_amount.events({
        'keyup #amount': function () {
            var amount = event.target.value;
            Session.set('amount', amount);
        }
    });
    Template.get_amount.onRendered(function () {
        this.autorun(function () {
            $("#qrcode > canvas").remove();
            $('#qrcode').qrcode({
                text: genURI(),
                label: 'bitfinex'
            });
        });
    });
    Tracker.autorun(function () {
        console.log('tracker autorun is being called');
        var address = Session.get("address");
        var blockchain = new WebSocket("wss://ws.blockchain.info/inv");
        blockchain.onmessage = function (msg){handleTransaction(msg)};
        blockchain.onopen = function(){
            blockchain.send(JSON.stringify({"op":"addr_sub", "addr":address}));
        };
    });
}
if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}
