package main

import "io"
import "fmt"
import "time"
import "net/http"
import "encoding/json"
import "github.com/garyburd/redigo/redis"

var pool redis.Pool

type HighScore struct {
	Score float64
	Time int64
}

func HandleScore(w http.ResponseWriter, req *http.Request) {
	var out string
	if req.Method == "GET" {
		var err interface {}
		conn := pool.Get()
		highScore, err := redis.Int(conn.Do("GET", "highScore:value"))
		if err == nil {
			currentHigh := HighScore{ float64(highScore), 0 }
			marshaled, _ := json.Marshal(currentHigh)
			out = string(marshaled)
		}
	} else {
		out = req.FormValue("scorePosted")
	}
	
	io.WriteString(w, out)
}

func setupConnectionPool() redis.Pool {
	dialFunc := func() (redis.Conn, error) {
		c, err := redis.Dial("tcp", "127.0.0.1:6379")
		if err != nil {
			return nil, err
		}
		return c, err
	}

	testOnBorrow := func(c redis.Conn, t time.Time) error {
		_, err := c.Do("PING")
		return err
	}
	
	// Initialize the redis connection pool used by the score handler.
	pool := redis.Pool {
		MaxIdle : 10,
		IdleTimeout: 300 * time.Second, 
		Dial: dialFunc,
		TestOnBorrow : testOnBorrow,
	}

	return pool
}

func main() {
	pool = setupConnectionPool()

	http.HandleFunc("/", HandleScore)
	fmt.Println("Began serving requests at: 127.0.0.1:4000", );
	http.ListenAndServe("localhost:4000", nil)
}