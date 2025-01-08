package ring

import (
	"net"
	"net/http"
	"time"

	gokit "github.com/go-kit/log"
	"github.com/grafana/dskit/kv"
	"github.com/grafana/dskit/kv/memberlist"
	"github.com/grafana/dskit/ring"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/grpcserver"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	ringName = "cache_ring"
	ringKey  = "cache/ring"
)

type RingCacheConfig struct {
	RingAddr         string
	RingPort         int
	MemberlistAddr   string
	MemberlistPort   int
	JoinMembers      []string
	HeartbeatPeriod  time.Duration
	HeartbeatTimeout time.Duration
}

type ringConfig struct {
	Addr             string
	Port             string
	HeartbeatPeriod  time.Duration
	HeartbeatTimeout time.Duration
}

func NewService(cfg *setting.Cfg, reg prometheus.Registerer, grpcProvider grpcserver.Provider) (*Cache, error) {
	logger := log.New("remotecache.ring")
	tmpConfig := RingCacheConfig{
		RingAddr:       "127.0.0.1",
		RingPort:       34831,
		MemberlistAddr: "127.0.0.1",
		MemberlistPort: 34832,
	}

	grpcAddr, grpcPort, err := net.SplitHostPort(cfg.GRPCServer.Address)
	if err != nil {
		return nil, err
	}

	memberlistsvc, client, err := newMemberlistService(memberlistConfig{
		AdvertiseAddr: grpcAddr,
		AdvertisePort: tmpConfig.MemberlistPort,
		Addr:          grpcAddr,
		Port:          tmpConfig.MemberlistPort,
		JoinMembers:   tmpConfig.JoinMembers,
	}, logger, reg)

	rg, lfc, err := newRing(tmpConfig.RingAddr,
		ringConfig{
			Addr:             tmpConfig.RingAddr,
			Port:             grpcPort,
			HeartbeatPeriod:  tmpConfig.HeartbeatPeriod,
			HeartbeatTimeout: tmpConfig.HeartbeatTimeout,
		},
		logger,
		client,
		reg,
	)

	c := &Cache{
		lfc:      lfc,
		kv:       client,
		ring:     rg,
		mlist:    memberlistsvc,
		logger:   logger,
		provider: grpcProvider,
		// FIXME: remove instances that has left
		backends: make(map[string]Backend),
	}

	c.backends[c.lfc.GetInstanceID()] = newLocalBackend()
	c.mux = buildMux(c.lfc, c.mlist)
	RegisterCacheDispatcherServer(c.provider.GetServer(), c)
	return c, nil
}

func buildMux(lfc *ring.BasicLifecycler, mlist *memberlist.KVInitService) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/remote_cache/ring/status", lfc)
	mux.Handle("/remote_cache/ring/kv", mlist)
	return mux
}

func newRing(id string, cfg ringConfig, logger log.Logger, client kv.Client,
	reg prometheus.Registerer) (*ring.Ring, *ring.BasicLifecycler, error) {
	var ringConfig ring.Config
	ringConfig.ReplicationFactor = 1
	ringConfig.HeartbeatTimeout = cfg.HeartbeatTimeout
	hring, err := ring.NewWithStoreClientAndStrategy(
		ringConfig,
		ringName,
		ringKey,
		client,
		ring.NewDefaultReplicationStrategy(),
		reg,
		gokit.With(logger, "component", "ring"),
	)

	if err != nil {
		return nil, nil, err
	}

	var config ring.BasicLifecyclerConfig
	config.ID = id
	config.HeartbeatPeriod = cfg.HeartbeatPeriod
	config.HeartbeatTimeout = cfg.HeartbeatTimeout
	config.Addr = net.JoinHostPort(cfg.Addr, cfg.Port)

	var delegate ring.BasicLifecyclerDelegate
	delegate = ring.NewInstanceRegisterDelegate(ring.ACTIVE, 128)
	delegate = ring.NewLeaveOnStoppingDelegate(delegate, logger)
	delegate = ring.NewAutoForgetDelegate(1*time.Minute, delegate, logger)

	lfc, err := ring.NewBasicLifecycler(
		config,
		ringName,
		ringKey,
		client,
		delegate,
		gokit.With(logger, "component", "lifecycler"),
		reg,
	)

	if err != nil {
		return nil, nil, err
	}

	hring.Get(0, ring.Read, nil, nil, nil)
	return hring, lfc, nil
}
