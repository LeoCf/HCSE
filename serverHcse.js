//Codigo inicial do webservices , ligaçao com box e vera , codigo muito primordial pouca xp em node,js mas já algo funciona

//Dependencias
var express    = require('express');        // dependencia do express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');    // para lidar com Json , 
var request = require("request");

//Ligação ao Vera 
var ligaçoes = ['http://aveiro.m-iti.org/hybridnilm/public/api/v1/plugwise/samples/hourly/plug/000D6F000261B01C/2016-11-26','http://192.168.1.216:3480/data_request?id=sdata&output_format=json'];
var resultados = [];
var deviceUrl1 = 'http://192.168.1.216:3480/data_request?id=action&output_format=xml&DeviceNum=';
var deviceUrl2 = '&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=';

//permite recebermos dados de um post
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
var port = process.env.PORT || 8080; //porta para se conectar

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
    res.json({ message: 'Bem vindo aos web services!' });   
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
    	if (error) throw new Error(error);
	})
    res.send("Comando aceite");
    console.log("Comando Recebido device id ="+device_id + "status ="+ status );
});




//Inciar o servidor 
app.listen(port);
console.log("Servidor iniciado na porta 8080");