cd /opt/omega/ops
curl -fsS http://alarm:8080/api/status.php
curl -fsS 'http://cctv:8080/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'
sudo -l
ls -la /opt/omega/proofs/
cat /opt/omega/ops/mesh.txt
