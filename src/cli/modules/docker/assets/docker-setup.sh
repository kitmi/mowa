#!/bin/bash

# TODO server must be Ubuntu 14.04.x LTS version
# TODO make sure we can run docker in this server

# Is docker already installed?
docker version > /dev/null 2>&1

if [ $? ]; then
  # Remove the lock
  set +e
  sudo rm /var/lib/dpkg/lock > /dev/null
  sudo rm /var/cache/apt/archives/lock > /dev/null
  sudo dpkg --configure -a
  set -e

  # Required to update system
  sudo apt-get update
  sudo apt-get -y install wget curl lxc

  # Install docker
  wget -qO- https://get.docker.com/ | sudo sh
  sudo usermod -a -G docker ${USER}
  sudo service docker start || sudo service docker restart
fi

# TODO make sure docker works as expected
