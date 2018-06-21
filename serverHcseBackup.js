//Dependencias
var express    = require('express');        // dependencia do express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');    // para lidar com Json , 
var request    = require("request");
var mysql 	   = require("mysql"); 				//utilizar o mysql

var ip_porta = "192.168.10.196:3480"; // para o caso de ser necessario mudar 
//Ligação ao Vera 
var ligaçoes = ['http://aveiro.m-iti.org/hybridnilm/public/api/v1/plugwise/samples/hourly/plug/000D6F000261B01C/2016-11-26','http://'+ip_porta+'/data_request?id=sdata&output_format=json'];
var resultados = [];
var deviceUrl1 = 'http://'+ip_porta+'/data_request?id=action&output_format=xml&DeviceNum=';
var deviceUrl2 = '&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=';
var lockUrl = 'http://'+ip_porta+'/data_request?id=lu_action&output_format=json&DeviceNum=18&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue=';
var desligar='http://'+ip_porta+'/data_request?id=action&output_format=xml&Category=999&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=0';
var ligar='http://'+ip_porta+'/data_request?id=action&output_format=xml&Category=999&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1';
//select device escolhe o device e faz accçoes especificadas pelo parametros a frente
var select_device ='http://'+ip_porta+'/data_request?id=lu_action&DeviceNum=';
// parametro especifica que serviço utilizar 
var light_device_select='&serviceId=urn:micasaverde-com:serviceId:PhilipsHue1&action=';
// parametro brith 
var light_brith='&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=';


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
var port = process.env.PORT ||22941; //porta para se conectar



/*Funcão recorsiva que liga-se a casa do lucas e ao vera e retira os dados (neste caso esta a tirar os dados da casa do lucas no dia 11 e ve o resultado
de um aparelho especificado pelo o mac adress para esse dia todo
*/
function ligaçãoRecursiva (urls)
 {
  var url = urls.pop();                               //pop manda para fora o ultimo elemento do array e retorna o elemento removido
  request(url,function(error,response,body){		
      resultados.push(body);		
   	} );						
      if(urls.length)
      {
        ligaçãoRecursiva(urls);
      } 
      else
      {
      	return resultados;
      	console.log("Recolha de Dados Completa");
      } 
 }

console.log(ligaçãoRecursiva(ligaçoes));

// conexão à BD
var con = mysql.createConnection({
  host     : 'localhost',
  user     : 'project',
  password : 'smart123',
  database : 'sHomedb',
  
});

//conectar a box da casa do lucas 
/*
var conectarBox = {
  url: 'http://aveiro.m-iti.org/hybridnilm/public/api/v1/plugwise/samples/hourly/plug/'
  +'000D6F000261B01C/2016-11-26',
  qs: {  output_format: 'json' }
 };

request(conectarBox, function (error, response, body) {
  if (error) throw new Error(error);

  

  
  console.log(body);
});


// parametros para estabelecer a ligação com a caixa 
var conectarVera = {
  url: 'http://192.168.2.121:3480/data_request',
  qs: { id: 'sdata', output_format: 'json' }
 };

request(conectarVera, function (error, response, body) {
  if (error) throw new Error(error);

  

  vera=body;
  console.log(vera);
});

*/

//Rotas da API

var router = express.Router();


router.get('/', function(req, res) {
    res.json({ message: 'Bem vindo aos web services! HCSE 2017' });   
});


//Registar as routas 

app.use('/',router);


//Retorna os dados Json da casa do lucas e dos dispositivos ligados ao vera 
app.get('/RawData',function(req,res){
	res.json(resultados);
	console.log("Pedido de RawData Recebido");
});


//Liga ou Desliga  status 1 ou 0 , um dispositivo especificado pelo id 
app.post('/ToggleDevice/:device_id/:status',function(req,res,next)
{
	var device_id = req.param('device_id');
    var status = req.param('status');  
    var url=deviceUrl1+device_id+deviceUrl2+status;
    request(url,function(error,response,body)
    {
    	if (error)
			console.log(error)
		console.log(body)	
	})
    res.send("Comando Recebido device id ="+device_id + "status ="+ status);
    console.log("Pedido Recebido device id ="+device_id + "status ="+ status );

    //Update na bd 	
    con.query(' UPDATE Actuator SET ActuatorState = ? WHERE idActuator='+device_id,
    [status],
    function(err,result)
    {
    	if(err) throw err;
    	console.log("Update Realizado device state =" +status);
    });
});

app.get("/GetDeviceStatus/:device_id",function(req,res,next){
	var device_id =req.param('device_id');

 	con.query('SELECT * FROM Actuator INNER JOIN Parameter ON Actuator.idActuator=Parameter.Actuator_idActuator WHERE Actuator.idActuator='+device_id, 
 	function(err, rows, fields)
 	 {
   		if (!err)
   		{
     		console.log('O Status do Device e: ',rows);
	 		res.json(rows);
  	   	}
  	   	else	   
     		console.log('Error while performing Query.');
   	});

 });

app.post('/Lock/:lock_id/:status',function(req,res,next)
{
	var lock_id = req.param('lock_id');
	var status = req.param('status'); 
    var url=lockUrl+status;
    request(url,function(error,response,body)
    {
    	if (error) throw new Error(error);
	})
    res.send("Comando aceite Status lock ="+status);
    console.log("Pedido Recebido device id =" +lock_id+ "status ="+ status );
    //Update na bd 	
    con.query('UPDATE Parameter SET ParameterValue = ? Where Actuator_idActuator='+lock_id,
    [status],
    function(err,result)
    {
    	if(err) throw err;
    	console.log("Update Realizado device state =" +status);
    });
});

//Liga ou Desliga  status 1 ou 0 , um dispositivo especificado pelo id 
app.post('/Light/TurnOffAll',function(req,res,next)
{

	var statusLuz=0;
    var url=desligar;
    request(url,function(error,response,body)
    {
    	if (error) throw new Error(error);
	})
    res.send("Comando aceite luzes status="+statusLuz);
    console.log("Pedido Recebido desligar todas as luzes" );
});

//Desliga todas as luzes 
app.post('/Light/TurnOnAll',function(req,res,next)
{
	con.query("UPDATE Parameter SET ParameterValue=24 WHERE ParameterName='Brightness' AND  Parameter.Actuator_idActuator   IN (Select idActuator FROM  Actuator WHERE  actuatorName='Light')",
    function(err,result)
    {
    	if(err) throw err;
    	console.log("Update Realizado Luzes Ligadas");
    });
	var statusLuz=1;
    var url=ligar;
    request(url,function(error,response,body)
    {
    	if (error) throw new Error(error);
	})
    res.send("Comando aceite luzes status=" +statusLuz);
    console.log("Pedido Recebido ligar todas as luzes" );
});



//Mudar Cor das luzes especificia-se o id da luz no light_id e o valor da cor  //faltar alterar
app.post('/Light/changeColor/:light_id/:color_id',function(req,res,next)
{
	  
	var light_id = req.param('light_id');
    var color = req.param('color_id');  
    var url=select_device+light_id+light_device_select+'SetHueAndSaturation&Hue='+color+'&Saturation=251';
    con.query('UPDATE Parameter SET Color= ? Where Actuator_idActuator='+light_id ,[color],
    function(err,res)
    {
   		if(err) throw err;

    console.log('Last insert ID:', res.insertId);
    });
    request(url,function(error,response,body)
    {
    	if (error)
    	{
			console.log(error);
			console.log(body);	
		}
	})
    res.send("Comando aceite mudar cor de luz com id="+light_id+"cor="+color);
    console.log("Pedido Recebido light id ="+light_id+"cor ="+ color);
});


//Mudar brightness das luzes 
app.post('/Light/changeBright/:device_id/:brigh_level',function(req,res,next)
{
	  
	var device_id= req.param('device_id');
    var parameter = req.param('brigh_level');  
    var url=select_device+device_id+light_brith+parameter;
    request(url,function(error,response,body)
    {
    	if (error)
			console.log(error)
		console.log(body)	
	})
    res.send("Comando Recebido britheness mudado da luz ="+device_id+"nivel="+ parameter);
    console.log("Pedido Recebido britheness mudado da luz ="+device_id+"nivel="+ parameter);
});


// Base de Dados   ********* BD ********

//Consulta dados na tabela User
app.get("/users",function(req,res,next){
 con.query('SELECT * from User', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
	 res.json(rows);
   }else	   
     console.log('Error while performing Query.');
   });

 });
//Consulta dados na tabela Appliance
app.get("/appliance",function(req,res,next){
 con.query('SELECT * from Appliance', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
	 res.json(rows);
   }else	   
     console.log('Error while performing Query.');
   });

 });
 
//Consulta dados na tabela Device
app.get("/devices",function(req,res,next){
 con.query('SELECT * from Device', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
	 res.json(rows);
   }else	   
     console.log('Error while performing Query.');
   });

 });

//Consulta dados na tabela Divisions
app.get("/division",function(req,res,next){
 con.query('SELECT * from Division', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
	 res.json(rows);
   }else	   
     console.log('Error while performing Query.');
   });

 });
 
 //Consulta dados na tabela HOME
app.get("/home",function(req,res,next){
 con.query('SELECT * from Home', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
	 res.json(rows);
   }else	   
     console.log('Error while performing Query.');
   });

 });
 //Devices join Sensor
app.get("/devicesjoinsensor",function(req,res,next){
 con.query('SELECT * from Device LEFT JOIN Sensor on Sensor.idSensor=Device.Sensor_idSensor ', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
     res.json(rows);
   }else
     console.log('Error while performing Query.');
   });
 });
 
 //Events join Devices
 app.get("/devicesjoinevents",function(req,res,next){
 con.query('SELECT * from Device LEFT JOIN Events on Device.idDevice=Events.Device_idDevice ', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
     res.json(rows);
   }else
     console.log('Error while performing Query.');
   });
 });
 
 //Events join Devices
 app.get("/devicesjoinactuator",function(req,res,next){
 con.query('SELECT * from Device LEFT JOIN Actuator on Actuator_idActuator=idActuator ', function(err, rows, fields) {
   if (!err){
     console.log('The solution is: ', rows);
     res.json(rows);
   }else
     console.log('Error while performing Query.');
   });
 });
 
// **** Fim BD


//Inciar o servidor 
app.listen(port);
console.log("Servidor iniciado na porta:" + port);
