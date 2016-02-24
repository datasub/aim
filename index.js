'use strict';

function aim(apiId, apiKey){
    this.apiId = apiId;
    this.apiKey = apiKey;
    this.apiUrl = 'https://secure.authorize.net/gateway/transact.dll';
    var self = this;
    var P = require('bluebird');
    var request = require('request');
    var post = P.promisify(request.post);
    var an = require('authorize-net')({API_LOGIN_ID: this.apiId,TRANSACTION_KEY: this.apiKey});
    function r(method, params){
        if(method === undefined || params === undefined){
            return false;
        }
        var p = {
            x_version : "3.1", 
            x_delim_char : "|",
            x_delim_data : "TRUE",
            x_relay_response : "FALSE",
            x_login : self.apiId,
            x_tran_key : self.apiKey
        };
        for(var i in params){
            p[i] = params[i];
        }
        p['x_type'] = method;

        return post(self.apiUrl,{form: p}); 
    }
    function parseTransaction(req){
        req = req[1].split('|');
        var transaction = {
            response_code        : req[0],
            response_subcode     : req[1],
            response_reason_code : req[2],
            response_reason_text : req[3],
            authorization_code   : req[4],
            avs_response         : req[5],
            transaction_id       : req[6],
            invoice_number       : req[7],
            description          : req[8],
            amount               : req[9],
            method               : req[10],
            transaction_type     : req[11],
            customer_id          : req[12],
            first_name           : req[13],
            last_name            : req[14],
            company              : req[15],
            address              : req[16],
            city                 : req[17],
            state                : req[18],
            zip_code             : req[19],
            country              : req[20],
            phone                : req[21],
            fax                  : req[22],
            email_address        : req[23],
            ship_to_first_name   : req[24],
            ship_to_last_name    : req[25],
            ship_to_company      : req[26],
            ship_to_address      : req[27],
            ship_to_city         : req[28],
            ship_to_state        : req[29],
            ship_to_zip_code     : req[30],
            ship_to_country      : req[31],
            tax                  : req[32],
            duty                 : req[33],
            freight              : req[34],
            tax_exempt           : req[35],
            purchase_order_number: req[36],
            md5_hash             : req[37],
            card_code_response   : req[38],
            cavv_response        : req[39],
            account_number       : req[50],
            card_type            : req[51],
            split_tender_id      : req[52],
            requested_amount     : req[53],
            balance_on_card      : req[54]
        };
        return P.resolve(transaction);
    }
    this.voidTransaction = function(transId){
        return r('VOID', {x_trans_id: transId}).then(parseTransaction).then(function(res){
            if(['310', '16'].indexOf(res.response_reason_code) > -1 ){
                return {responseCode: ['1'], transactionStatus: ['voided']};
            }
            return an.getTransactionDetails(transId);
        });
    };
    this.refundTransaction = function(transId){
        var self = this;
        return an.getTransactionDetails(transId).then(function (res) {
            return  r('CREDIT', {x_trans_id: transId, x_card_type: 'Token', x_card_num: res.payment[0].tokenInformation[0].tokenNumber[0], x_amount: res.settleAmount[0]})
                .then(parseTransaction).then(function(res){
                    if(res.response_code === "1"){
                        return an.getTransactionDetails(transId);
                    }else{
                        return self.voidTransaction(transId);
                    }
                });
        });          
    };
    this.captureAuthTransaction = function(transId){
        return r('PRIOR_AUTH_CAPTURE', {x_trans_id: transId}).then(function(res){
            return an.getTransactionDetails(transId);
        });//.then(parseTransaction);
    };
};
module.exports = function(apiId, apiKey){
    return new aim(apiId, apiKey);
};