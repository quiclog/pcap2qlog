#!/bin/bash
# sudo docker build -t qlogcomparer .

sudo docker stop qlogcomparer && sudo docker rm qlogcomparer
sudo docker run -it --privileged --name qlogcomparer --volume=/home/robin/aioquic_docker/qlog:/srv/qlog qlogcomparer

# then:
# cd /srv/pcap2qlog
# src/scripts/comparisons/compare.sh FILE /srv/qlog /srv/qlog/comparisons