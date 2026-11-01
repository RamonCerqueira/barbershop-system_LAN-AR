import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { HttpError } from './http'
const root = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(),'private-uploads'))
export function imageType(buffer: Buffer) {
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png'
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg'
  throw new HttpError(400,'Apenas imagens PNG ou JPEG são permitidas.')
}
export async function saveProof(value: string) {
  const match=/^data:image\/(png|jpeg);base64,([a-zA-Z0-9+/=]+)$/.exec(value)
  if(!match)throw new HttpError(400,'Comprovante inválido.')
  const buffer=Buffer.from(match[2],'base64')
  if(buffer.length>1_000_000||buffer.length<8)throw new HttpError(400,'O comprovante deve ter até 1 MB.')
  if(imageType(buffer)!=='image/'+match[1])throw new HttpError(400,'O conteúdo não corresponde ao tipo da imagem.')
  const id=randomUUID()
  await mkdir(root(),{recursive:true})
  await writeFile(path.join(root(),id),buffer,{mode:0o600,flag:'wx'})
  return '/api/proofs/'+id
}
export async function readProof(id: string) {
  if(!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(404,'Não encontrado.')
  const buffer=await readFile(path.join(root(),id))
  return {buffer,type:imageType(buffer)}
}
export async function removeProof(url: string) {
  const id=url.replace('/api/proofs/','')
  if(/^[a-f0-9-]{36}$/.test(id))await unlink(path.join(root(),id)).catch(()=>{})
}
