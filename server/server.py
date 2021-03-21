from gevent import monkey; monkey.patch_all()
from flask import Flask, Response, render_template, stream_with_context, request
from gevent.pywsgi import WSGIServer
import json
import random
from time import sleep
import threading
import queue
from flask_cors import CORS, cross_origin

app = Flask(__name__)
cors = CORS(app)
# app.config['CORS_HEADERS'] = 'Content-Type'


class StockPriceGenerator():

    def __init__(self):
        self.update_frequency = 0
        self.elements_per_update = 0
        self.symbols = []
        self.update_timer = None
        self.batches = []
        self.current_batch = 0
        self.update_serial = 1

        # for passing events
        self.subscribers = []

    def load_config_file(self):
        with open('config_file.json') as json_file:
            data = json.load(json_file)
            self.symbols = data["symbols"]
            self.elements_per_update = float(data["elements_per_update"])
            self.update_frequency = float(data["update_frequency_milliseconds"])
    
    def configure_generator(self):
        i = 0
        curr_batch = []
        while (i<len(self.symbols)):
            curr_batch.append({
                "symbol":self.symbols[i],
                "price":0
            })
            i+=1

            if ((i%self.elements_per_update) == 0):
                self.batches.append(curr_batch)
                curr_batch = []
        if (len(curr_batch)!=0):
            self.batches.append(curr_batch)

    def generate_price_table(self):
        for i in range(len(self.batches[self.current_batch])):
            self.batches[self.current_batch][i]["price"] = random.randint(0,50000)
        self.emit_prices()

    def start_timer(self):
        self.generate_price_table()
        self.update_timer = threading.Timer(self.update_frequency/1000, self.start_timer)
        self.update_timer.start()
        

    def stop_timer(self):
        if self.update_timer:
            self.update_timer.cancel()

    def emit_prices(self):
        msg = f'data: {json.dumps(self.batches[self.current_batch])}\n\n' 
        
        self.publish(msg)
        self.current_batch +=1 
        self.current_batch %= len(self.batches)

    def subscribe(self):
        self.subscribers.append(queue.Queue(maxsize=1))
        return self.subscribers[-1]
    
    def publish(self, msg):
        # going backward because del subscribers will shift indexes
        for i in reversed(range(len(self.subscribers))):
            try:
                self.subscribers[i].put_nowait(msg)
            except queue.Full:
                del self.subscribers[i]
        self.update_serial+=1


price_gen = StockPriceGenerator()
price_gen.load_config_file()
price_gen.configure_generator()
price_gen.start_timer()


@app.route("/updateFrequency", methods = ['POST'])
# @cross_origin()
def change_update_frequency():
    if request.method == 'POST':
        freq = float(json.loads(request.data)["frequency"])
        if freq > 0:
            price_gen.update_frequency = freq
        return "True", 200

def stream_data():
    # subscribe
    subs = price_gen.subscribe()
    while True:
        msg = subs.get()
        yield msg


@app.route("/stream")
@cross_origin()
def listen():
  return Response(stream_data(), mimetype='text/event-stream')

if __name__ == "__main__":
  http_server = WSGIServer(("localhost", 80), app)
  http_server.serve_forever()