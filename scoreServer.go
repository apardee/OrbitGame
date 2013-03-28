package main

import "io"
import "fmt"
import "time"
import "strconv"
import "net/http"
import "encoding/json"
import "github.com/garyburd/redigo/redis"

var pool redis.Pool

type HighScore struct {
	Score float64
	Time  int64
}

// Http request handler for posting and getting high scores.
func HandleScore(w http.ResponseWriter, req *http.Request) {
	var out string

	// Connect to the data source.
	conn := pool.Get()
	defer conn.Close()

	outVal, err := redis.Bytes(conn.Do("GET", "highScore:value"))
	if err != nil {
		return
	}

	highScore, err := strconv.ParseFloat(string(outVal), 64)
	if err != nil {
		return
	}

	if req.Method == "GET" {
		// Retrieve the high score from the server and format it as json.
		if err == nil {
			currentHigh := HighScore{float64(highScore), 0}
			marshaled, _ := json.Marshal(currentHigh)
			out = string(marshaled)
		}
	} else if req.Method == "POST" {
		postedScore, err := strconv.ParseFloat(req.FormValue("scorePosted"), 64)
		if err == nil && postedScore > highScore {
			conn.Do("SET", "highScore:value", postedScore)
		}
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
	pool := redis.Pool{
		MaxIdle:      250,
		IdleTimeout:  300 * time.Second,
		Dial:         dialFunc,
		TestOnBorrow: testOnBorrow,
	}

	return pool
}

func main() {
	pool = setupConnectionPool()

	http.Handle("/", http.FileServer(http.Dir("./public")))
	http.HandleFunc("/scores", HandleScore)

	fmt.Println("Began serving requests at: 127.0.0.1:4000")
	http.ListenAndServe(":4000", nil)
}
