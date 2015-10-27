if (Meteor.isClient) {
    Meteor.startup(function () {
        Session.setDefault('amount', 1);
        Session.setDefault('address', "1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur");
        Session.setDefault('uri', 'bitcoin:1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur?amount=0.01');
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
            if (msg[0] == 2) {
                Session.set('price', msg[1]);
            }
        };
    });
    Template.auth.events({
        'submit form': function () {
            event.preventDefault();
            Session.set('api_key', event.target.api_key.value);
            Session.set('api_secret', event.target.api_secret.value);
            event.target.api_key.value = '';
            event.target.api_secret.value = '';
        }
    });
    Template.body.helpers({
        has_creds: function () {
            if (Session.get('api_key') != null)
                return true;
        }
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
    Template.get_amount.events({
        'keyup #amount': function () {
            var amount = event.target.value;
            Session.set('amount', amount);
        },
        'keyup #address': function () {
            var address = event.target.value;
            Session.set('address', address);
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
}
if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}
