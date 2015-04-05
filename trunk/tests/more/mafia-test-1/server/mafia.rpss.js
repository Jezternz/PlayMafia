var RPubSubFactory = function(dbcom){

	var len,indx;
	var
		rPubSubIdCounter = 1,
		clientLookup = {},
		globalSubscriptions = {};

	// public
	this.createClient = function()
	{
		var rpsc = new RPubSupClient();
		return rpsc;
	}
	
	// private
	var constructor = function()
	{
		dbcom.on("message", incommingMessage);
	}
	var incommingMessage = function(rawchannel, strMessage){
		len = globalSubscriptions[rawchannel].length;
		for(var i=0;i<len;i++){
			//console.log(globalSubscriptions[rawchannel][i]+' incomming on channel '+rawchannel);
			clientLookup[globalSubscriptions[rawchannel][i]]._incommingMessage(rawchannel, strMessage);
		}
	}
	
	// class
	var RPubSupClient = function()
	{
		var 
			id = -1,
			localSubscriptions = [];
		
		this._incommingMessage = function(){};
	
		this.subscribe = function(channel)
		{
			//console.log(id+' subscribing to '+channel);
			if(!(channel in globalSubscriptions)){
				globalSubscriptions[channel] = [id];
				dbcom.subscribe(channel);
			}
			else if(globalSubscriptions[channel].indexOf(id) == -1){
				globalSubscriptions[channel].push(id);
				dbcom.subscribe(channel);
			}
			if(localSubscriptions.indexOf(channel) == -1){
				localSubscriptions.push(channel);
			}
		}
		this.unsubscribe = function(channel)
		{
			//console.log(id+' unsubscribing to '+channel);
			if(!(channel in globalSubscriptions))return;
			indx = globalSubscriptions[channel].indexOf(id);
			if(indx != -1){
				globalSubscriptions[channel].splice(indx, 1);
				if(globalSubscriptions[channel].length == 0){
					delete globalSubscriptions[channel];
					dbcom.unsubscribe(channel);
				}
			}
			indx = localSubscriptions.indexOf(channel);
			if(indx != -1){
				localSubscriptions.splice(indx, 1);
			}
		}
		this.onMessage = function(msgFn)
		{
			this._incommingMessage = msgFn;
		}
		this.end = function()
		{
			//console.log(id+' end');
			len = localSubscriptions.length;
			for(var i=0;i<len;i++){
				this.unsubscribe(localSubscriptions[i]);
			}
			localSubscriptions = [];
			delete clientLookup[id];
		}
		
		var constructor = function(){
			id = rPubSubIdCounter++;
			clientLookup[id] = this;
			//console.log(id+' new');
		}
		
		constructor.apply(this, arguments);
	}
	
	constructor.apply(this, arguments);
};

module.exports = RPubSubFactory;